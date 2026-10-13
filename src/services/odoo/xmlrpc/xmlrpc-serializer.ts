/**
 * Pure TypeScript XML-RPC Serializer and Parser for Odoo External API.
 *
 * Designed for React Native (Hermes/JSC) and Node.js without external DOM or native dependencies.
 * Complies with the XML-RPC specification (http://xmlrpc.com/spec.md) and Odoo /xmlrpc/2 gateway.
 */

export class OdooXmlRpcFaultError extends Error {
  public faultCode: number;
  public faultString: string;

  constructor(faultCode: number, faultString: string) {
    super(`Odoo XML-RPC Fault [${faultCode}]: ${faultString}`);
    this.name = 'OdooXmlRpcFaultError';
    this.faultCode = faultCode;
    this.faultString = faultString;
  }
}

export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXml(str: string): string {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function serializeXmlRpcValue(val: unknown): string {
  if (val === null || val === undefined) {
    return '<nil/>';
  }

  if (typeof val === 'boolean') {
    return `<boolean>${val ? 1 : 0}</boolean>`;
  }

  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return `<int>${val}</int>`;
    }
    return `<double>${val}</double>`;
  }

  if (typeof val === 'string') {
    return `<string>${escapeXml(val)}</string>`;
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => `<value>${serializeXmlRpcValue(item)}</value>`).join('');
    return `<array><data>${items}</data></array>`;
  }

  if (typeof val === 'object') {
    const members = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `<member><name>${escapeXml(k)}</name><value>${serializeXmlRpcValue(v)}</value></member>`)
      .join('');
    return `<struct>${members}</struct>`;
  }

  return `<string>${escapeXml(String(val))}</string>`;
}

export function serializeXmlRpcMethodCall(methodName: string, params: unknown[] = []): string {
  const paramsXml = params
    .map((p) => `<param><value>${serializeXmlRpcValue(p)}</value></param>`)
    .join('');
  return `<?xml version="1.0"?><methodCall><methodName>${escapeXml(methodName)}</methodName><params>${paramsXml}</params></methodCall>`;
}

class XmlRpcTokenizer {
  private xml: string;
  public pos: number = 0;

  constructor(xml: string) {
    this.xml = xml;
  }

  skipWhitespace(): void {
    while (this.pos < this.xml.length && /\s/.test(this.xml[this.pos])) {
      this.pos++;
    }
  }

  peekTag(): string | null {
    this.skipWhitespace();
    if (this.xml[this.pos] !== '<') return null;
    const end = this.xml.indexOf('>', this.pos);
    if (end === -1) return null;
    return this.xml.slice(this.pos + 1, end).trim();
  }

  readTag(): string {
    this.skipWhitespace();
    if (this.xml[this.pos] !== '<') {
      throw new Error(`Expected '<' at position ${this.pos}`);
    }
    const end = this.xml.indexOf('>', this.pos);
    if (end === -1) {
      throw new Error(`Unterminated tag starting at position ${this.pos}`);
    }
    const tagContent = this.xml.slice(this.pos + 1, end).trim();
    this.pos = end + 1;
    return tagContent;
  }

  readUntilTag(closingTag: string): string {
    const start = this.pos;
    const marker = `<${closingTag}`;
    const nextIdx = this.xml.indexOf(marker, this.pos);
    if (nextIdx === -1) {
      const remaining = this.xml.slice(start);
      this.pos = this.xml.length;
      return unescapeXml(remaining.trim());
    }
    const text = this.xml.slice(start, nextIdx);
    this.pos = nextIdx;
    return unescapeXml(text.trim());
  }
}

export class XmlRpcDeserializer {
  private tokenizer: XmlRpcTokenizer;

  constructor(xml: string) {
    this.tokenizer = new XmlRpcTokenizer(xml);
  }

  public parse(): unknown {
    this.tokenizer.skipWhitespace();

    // Skip XML declaration if present
    const firstTag = this.tokenizer.peekTag();
    if (firstTag && firstTag.startsWith('?xml')) {
      this.tokenizer.readTag();
    }

    this.tokenizer.skipWhitespace();
    const rootTag = this.tokenizer.readTag();
    if (rootTag !== 'methodResponse') {
      throw new Error(`Invalid XML-RPC response: expected <methodResponse>, received <${rootTag}>`);
    }

    this.tokenizer.skipWhitespace();
    const nextTag = this.tokenizer.peekTag();

    if (nextTag === 'fault') {
      this.tokenizer.readTag(); // <fault>
      const faultStruct = this.parseValue() as Record<string, unknown>;
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </fault>
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </methodResponse>

      const faultCode = typeof faultStruct.faultCode === 'number' ? faultStruct.faultCode : 0;
      const faultString = typeof faultStruct.faultString === 'string' ? faultStruct.faultString : 'Odoo server fault';
      throw new OdooXmlRpcFaultError(faultCode, faultString);
    }

    if (nextTag === 'params') {
      this.tokenizer.readTag(); // <params>
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // <param>
      const result = this.parseValue();
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </param>
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </params>
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </methodResponse>
      return result;
    }

    throw new Error(`Unexpected XML-RPC structure inside <methodResponse>: <${nextTag}>`);
  }

  private parseValue(): unknown {
    this.tokenizer.skipWhitespace();
    const tag = this.tokenizer.readTag();
    if (tag !== 'value') {
      throw new Error(`Expected <value>, found <${tag}> at pos ${this.tokenizer.pos}`);
    }

    this.tokenizer.skipWhitespace();
    const innerTag = this.tokenizer.peekTag();

    // Self-closing or untagged value
    if (!innerTag || innerTag.startsWith('/')) {
      if (innerTag === '/value') {
        this.tokenizer.readTag();
        return '';
      }
      const text = this.tokenizer.readUntilTag('/value');
      this.tokenizer.readTag();
      return text;
    }

    let parsedResult: unknown;

    if (innerTag === 'nil/' || innerTag === 'nil') {
      this.tokenizer.readTag();
      parsedResult = null;
    } else if (innerTag === 'boolean') {
      this.tokenizer.readTag();
      const val = this.tokenizer.readUntilTag('/boolean');
      this.tokenizer.readTag();
      parsedResult = val === '1' || val.toLowerCase() === 'true';
    } else if (innerTag === 'int' || innerTag === 'i4') {
      const typeTag = this.tokenizer.readTag();
      const val = this.tokenizer.readUntilTag(`/${typeTag}`);
      this.tokenizer.readTag();
      parsedResult = parseInt(val, 10);
    } else if (innerTag === 'double') {
      this.tokenizer.readTag();
      const val = this.tokenizer.readUntilTag('/double');
      this.tokenizer.readTag();
      parsedResult = parseFloat(val);
    } else if (innerTag === 'string') {
      this.tokenizer.readTag();
      const val = this.tokenizer.readUntilTag('/string');
      this.tokenizer.readTag();
      parsedResult = val;
    } else if (innerTag === 'dateTime.iso8601') {
      this.tokenizer.readTag();
      const val = this.tokenizer.readUntilTag('/dateTime.iso8601');
      this.tokenizer.readTag();
      parsedResult = val;
    } else if (innerTag === 'array') {
      this.tokenizer.readTag(); // <array>
      this.tokenizer.skipWhitespace();
      const dataTag = this.tokenizer.readTag(); // <data>
      const list: unknown[] = [];
      if (dataTag === 'data') {
        while (true) {
          this.tokenizer.skipWhitespace();
          const next = this.tokenizer.peekTag();
          if (next === '/data') {
            this.tokenizer.readTag();
            break;
          }
          list.push(this.parseValue());
        }
      }
      this.tokenizer.skipWhitespace();
      this.tokenizer.readTag(); // </array>
      parsedResult = list;
    } else if (innerTag === 'struct') {
      this.tokenizer.readTag(); // <struct>
      const obj: Record<string, unknown> = {};
      while (true) {
        this.tokenizer.skipWhitespace();
        const next = this.tokenizer.peekTag();
        if (next === '/struct') {
          this.tokenizer.readTag();
          break;
        }
        if (next === 'member') {
          this.tokenizer.readTag(); // <member>
          this.tokenizer.skipWhitespace();
          this.tokenizer.readTag(); // <name>
          const memberName = this.tokenizer.readUntilTag('/name');
          this.tokenizer.readTag(); // </name>
          const memberValue = this.parseValue();
          this.tokenizer.skipWhitespace();
          this.tokenizer.readTag(); // </member>
          obj[memberName] = memberValue;
        } else {
          throw new Error(`Unexpected tag inside struct: <${next}>`);
        }
      }
      parsedResult = obj;
    } else {
      parsedResult = this.tokenizer.readUntilTag('/value');
    }

    this.tokenizer.skipWhitespace();
    const closeValue = this.tokenizer.readTag();
    if (closeValue !== '/value') {
      throw new Error(`Expected </value>, found <${closeValue}>`);
    }

    return parsedResult;
  }
}

export function deserializeXmlRpcResponse<T = unknown>(xmlText: string): T {
  const deserializer = new XmlRpcDeserializer(xmlText);
  return deserializer.parse() as T;
}
