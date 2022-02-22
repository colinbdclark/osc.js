import type * as EventEmitter from "events";
import type {
  Argument,
  ReadArgumentWithMetadata,
  WriteArgumentWithMetadata,
  Message,
  SingleByteMessage,
  FullTimeTag,
  ReadPacket,
  WritePacket,
  ReadBundle,
} from "./osc";

export interface Port<
  RA extends Argument | ReadArgumentWithMetadata,
  RM extends Message<RA> | SingleByteMessage<RA>,
  WA extends Argument | WriteArgumentWithMetadata,
  WM extends Message<WA> | SingleByteMessage<WA>
> extends EventEmitter {
  send(oscPacket: WritePacket<WA, WM>): void;

  on(event: "ready", listener: () => unknown): this;
  on(event: "message", listener: (message: RM, timeTag: FullTimeTag, info: any) => unknown): this;
  on(event: "bundle", listener: (message: ReadBundle<RA, RM>, timeTag: FullTimeTag, info: any) => unknown): this;
  on(event: "osc", listener: (message: ReadPacket<RA, RM>, timeTag: FullTimeTag, info: any) => unknown): this;
  on(event: "raw", listener: (data: Uint8Array, info: any) => unknown): this;
  on(event: "error", listener: (error: any) => unknown): this;
  once(event: "ready", listener: () => unknown): this;
  once(event: "message", listener: (message: RM, timeTag: FullTimeTag, info: any) => unknown): this;
  once(event: "bundle", listener: (message: ReadBundle<RA, RM>, timeTag: FullTimeTag, info: any) => unknown): this;
  once(event: "osc", listener: (message: ReadPacket<RA, RM>, timeTag: FullTimeTag, info: any) => unknown): this;
  once(event: "raw", listener: (data: Uint8Array, info: any) => unknown): this;
  once(event: "error", listener: (error: any) => unknown): this;
}

export interface PortGenericOperations {
  open(): void;
  listen(): void;
  close(): void;
}

export interface PortConstructor<Additional = never, Options = never> {
  new (options?: { unpackSingleArgs?: false; metadata?: false } & Options): Port<
    Argument,
    Message<Argument>,
    Argument,
    Message<Argument>
  > &
    Additional;
  new (options: { unpackSingleArgs?: false; metadata: true } & Options): Port<
    ReadArgumentWithMetadata,
    Message<ReadArgumentWithMetadata>,
    WriteArgumentWithMetadata,
    Message<WriteArgumentWithMetadata>
  > &
    Additional;
  new (options: { unpackSingleArgs: true; metadata?: false } & Options): Port<
    Argument,
    SingleByteMessage<Argument>,
    Argument,
    SingleByteMessage<Argument>
  > &
    Additional;
  new (options: { unpackSingleArgs: true; metadata: true } & Options): Port<
    ReadArgumentWithMetadata,
    SingleByteMessage<ReadArgumentWithMetadata>,
    WriteArgumentWithMetadata,
    SingleByteMessage<WriteArgumentWithMetadata>
  > &
    Additional;
}

export type Relay = PortGenericOperations;

export interface SerialPortOptions {
  devicePath?: string;
  connectionId?: any;
  bitrate?: number;
}

export interface UDPPortOptions {
  localPort?: number;
  localAddress?: string;
  remotePort?: number;
  remoteAddress?: string;
  broadcast?: boolean;
  multicastTTL?: number;
  multicastMembership?: string[];
  socket?: any;
  socketId?: any;
}

export interface TCPSocketPortOptions {
  port?: number;
  address?: string;
  localPort?: number;
  localAddress?: string;
  socket?: any;
}

export interface WebSocketPortOptions {
  url?: string;
  socket?: WebSocket;
}

export interface OSCTransport {
  Port: PortConstructor;
  Relay: new (port1: Port<any, any, any, any>, port2: Port<any, any, any, any>, options?: { raw?: boolean }) => Relay;
  SerialPort: PortConstructor<PortGenericOperations & { sendRaw(encoded: any): void }, SerialPortOptions>;
  UDPPort: PortConstructor<PortGenericOperations & { sendRaw(encoded: any, address: any, port: any): void }, UDPPortOptions>;
  TCPSocketPort: PortConstructor<PortGenericOperations & { sendRaw(encoded: any): void }, TCPSocketPortOptions>;
  WebSocketPort: PortConstructor<PortGenericOperations & { sendRaw(encoded: any): void }, WebSocketPortOptions>;

  supportsSerial: boolean;
}
