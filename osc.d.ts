export interface LongLike {
  /**
   * The high 32 bits as a signed value.
   */
  high: number;

  /**
   * The low 32 bits as a signed value.
   */
  low: number;

  /**
   * Whether unsigned or not.
   */
  unsigned: boolean;
}

export interface OffsetState {
  idx: number;
}

export type BufferFromData =
  | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
  | Uint8Array
  | ReadonlyArray<number>
  | WithImplicitCoercion<Uint8Array | ReadonlyArray<number> | string>
  | WithImplicitCoercion<string>
  | {
      [Symbol.toPrimitive](hint: "string"): string;
    };

export type ByteArrayData =
  | Uint8Array
  | ArrayLike<number>
  | ArrayBufferLike
  | { readonly buffer: ArrayLike<number> | ArrayBufferLike };
export type DataViewData = ArrayBufferLike | { readonly buffer: ArrayBufferLike } | ArrayLike<number>;

export type Color = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type NTPTime = [number, number];

export interface RawTimeTag {
  raw: NTPTime;
}

export interface NativeTimeTag {
  native: number;
}

export type TimeTag = RawTimeTag | NativeTimeTag;
export type FullTimeTag = RawTimeTag & NativeTimeTag;

export type ArgumentType = keyof ArgumentWithMetadataMap<TimeTag>;

export interface ArgumentWithMetadataMap<T extends TimeTag> {
  i: number;
  h: LongLike;
  f: number;
  s: string;
  S: string;
  b: Uint8Array;
  t: T;
  T: true;
  F: false;
  N: null;
  I: number;
  d: number;
  c: string;
  r: Color;
  m: Uint8Array;
}

export type Argument = number | string | boolean | Color | Uint8Array | null | LongLike | FullTimeTag;
export interface ArgumentWithMetadataShape<T extends TimeTag, Type extends ArgumentType = any> {
  type: Type;
  value: ArgumentWithMetadataMap<T>[Type];
}

export type ReadArgumentWithMetadataShape<Type extends ArgumentType = ArgumentType> = ArgumentWithMetadataShape<
  FullTimeTag,
  Type
>;
export type WriteArgumentWithMetadataShape<Type extends ArgumentType = ArgumentType> = ArgumentWithMetadataShape<
  TimeTag,
  Type
>;

export type ReadArgumentWithMetadata = {
  [K in keyof ArgumentWithMetadataMap<TimeTag>]: ReadArgumentWithMetadataShape<K>;
}[ArgumentType];

export type WriteArgumentWithMetadata = {
  [K in keyof ArgumentWithMetadataMap<TimeTag>]: WriteArgumentWithMetadataShape<K>;
}[ArgumentType];

export interface Message<A extends Argument | ArgumentWithMetadataShape<any>> {
  address: string;
  args: A[];
}

export interface SingleByteMessage<A extends Argument | ArgumentWithMetadataShape<any>> {
  address: string;
  args: A;
}

export type Bundle<
  T extends TimeTag,
  A extends Argument | ReadArgumentWithMetadata | WriteArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = {
  timeTag: T;
  packets: Packet<T, A, M>[];
};

export type ReadBundle<
  A extends Argument | ReadArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = Bundle<FullTimeTag, A, M>;

export type WriteBundle<
  A extends Argument | WriteArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = Bundle<TimeTag, A, M>;

export type Packet<
  T extends TimeTag,
  A extends Argument | ReadArgumentWithMetadata | WriteArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = M | Bundle<T, A, M>;

export type ReadPacket<
  A extends Argument | ReadArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = Packet<FullTimeTag, A, M>;

export type WritePacket<
  A extends Argument | WriteArgumentWithMetadata,
  M extends Message<A> | SingleByteMessage<A>
> = Packet<TimeTag, A, M>;

export interface OSC {
  SECS_70YRS: number;
  TWO_32: number;

  defaults: {
    metadata: boolean;
    unpackSingleArgs: boolean;
  };

  /**
   * Reads an OSC-formatted string.
   *
   * @param {DataView} dv a DataView containing the raw bytes of the OSC string
   * @param {Object} offsetState an offsetState object used to store the current offset index
   * @return {String} the JavaScript String that was read
   */
  readString: (
    dv: DataView,
    offsetState: OffsetState
  ) => string & {
    raw(charCodes: ReadonlyArray<number>): string;
    withTextDecoder(charCodes: BufferSource): string;
    withBuffer(charCodes: BufferFromData): string;
  };

  /**
   * Writes a JavaScript string as an OSC-formatted string.
   *
   * @param {String} str the string to write
   * @return {Uint8Array} a buffer containing the OSC-formatted string
   */
  writeString: ((str: string) => Uint8Array) & {
    withTextEncoder(str: string): Uint8Array;
    withBuffer(str: BufferFromData): Buffer;
  };

  /**
   * Reads an OSC int32 ("i") value.
   *
   * @param {DataView} dv a DataView containing the raw bytes
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Number} the number that was read
   */
  readInt32(dv: DataView, offsetState: OffsetState): number;

  /**
   * Writes an OSC int32 ("i") value.
   *
   * @param {Number} val the number to write
   * @param {DataView} [dv] a DataView instance to write the number into
   * @param {Number} [offset] an offset into dv
   */
  writeInt32(val: number, dv: DataView, offset: number): Uint8Array;

  /**
   * Reads an OSC int64 ("h") value.
   *
   * @param {DataView} dv a DataView containing the raw bytes
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Number} the number that was read
   */
  readInt64(dv: DataView, offsetState: OffsetState): LongLike;

  /**
   * Writes an OSC int64 ("h") value.
   *
   * @param {Number} val the number to write
   * @param {DataView} [dv] a DataView instance to write the number into
   * @param {Number} [offset] an offset into dv
   */
  writeInt64(val: LongLike, dv: DataView, offset: number): Uint8Array;

  /**
   * Reads an OSC float32 ("f") value.
   *
   * @param {DataView} dv a DataView containing the raw bytes
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Number} the number that was read
   */
  readFloat32(dv: DataView, offsetState: OffsetState): number;

  /**
   * Writes an OSC float32 ("f") value.
   *
   * @param {Number} val the number to write
   * @param {DataView} [dv] a DataView instance to write the number into
   * @param {Number} [offset] an offset into dv
   */
  writeFloat32(val: number, dv: DataView, offset: number): Uint8Array;

  /**
   * Reads an OSC float64 ("d") value.
   *
   * @param {DataView} dv a DataView containing the raw bytes
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Number} the number that was read
   */
  readFloat64(dv: DataView, offsetState: OffsetState): number;

  /**
   * Writes an OSC float64 ("d") value.
   *
   * @param {Number} val the number to write
   * @param {DataView} [dv] a DataView instance to write the number into
   * @param {Number} [offset] an offset into dv
   */
  writeFloat64(val: number, dv: DataView, offset: number): Uint8Array;

  /**
   * Reads an OSC 32-bit ASCII character ("c") value.
   *
   * @param {DataView} dv a DataView containing the raw bytes
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {String} a string containing the read character
   */
  readChar32(dv: DataView, offsetState: OffsetState): string;

  /**
   * Writes an OSC 32-bit ASCII character ("c") value.
   *
   * @param {String} str the string from which the first character will be written
   * @param {DataView} [dv] a DataView instance to write the character into
   * @param {Number} [offset] an offset into dv
   * @return {String} a string containing the read character
   */
  writeChar32(str: string, dv: DataView, offset: number): Uint8Array;

  /**
   * Reads an OSC blob ("b") (i.e. a Uint8Array).
   *
   * @param {DataView} dv a DataView instance to read from
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Uint8Array} the data that was read
   */
  readBlob(dv: DataView, offsetState: OffsetState): Uint8Array;

  /**
   * Writes a raw collection of bytes to a new ArrayBuffer.
   *
   * @param {Array-like} data a collection of octets
   * @return {ArrayBuffer} a buffer containing the OSC-formatted blob
   */
  writeBlob(data: ByteArrayData): Uint8Array;

  /**
   * Reads an OSC 4-byte MIDI message.
   *
   * @param {DataView} dv the DataView instance to read from
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Uint8Array} an array containing (in order) the port ID, status, data1 and data1 bytes
   */
  readMIDIBytes(dv: DataView, offsetState: OffsetState): Uint8Array;

  /**
   * Writes an OSC 4-byte MIDI message.
   *
   * @param {Array-like} bytes a 4-element array consisting of the port ID, status, data1 and data1 bytes
   * @return {Uint8Array} the written message
   */
  writeMIDIBytes(bytes: ByteArrayData): Uint8Array;

  /**
   * Reads an OSC RGBA colour value.
   *
   * @param {DataView} dv the DataView instance to read from
   * @param {Object} offsetState an offsetState object used to store the current offset index into dv
   * @return {Object} a colour object containing r, g, b, and a properties
   */
  readColor(dv: DataView, offsetState: OffsetState): Color;

  /**
   * Writes an OSC RGBA colour value.
   *
   * @param {Object} color a colour object containing r, g, b, and a properties
   * @return {Uint8Array} a byte array containing the written color
   */
  writeColor(color: Color): Uint8Array;

  /**
   * Reads an OSC true ("T") value by directly returning the JavaScript Boolean "true".
   */
  readTrue(): true;

  /**
   * Reads an OSC false ("F") value by directly returning the JavaScript Boolean "false".
   */
  readFalse(): false;

  /**
   * Reads an OSC nil ("N") value by directly returning the JavaScript "null" value.
   */
  readNull(): null;

  /**
   * Reads an OSC impulse/bang/infinitum ("I") value by directly returning 1.0.
   */
  readImpulse(): 1.0;

  /**
   * Reads an OSC time tag ("t").
   *
   * @param {DataView} dv the DataView instance to read from
   * @param {Object} offsetState an offset state object containing the current index into dv
   * @param {Object} a time tag object containing both the raw NTP as well as the converted native (i.e. JS/UNIX) time
   */
  readTimeTag(dv: DataView, offsetState: OffsetState): FullTimeTag;

  /**
   * Writes an OSC time tag ("t").
   *
   * Takes, as its argument, a time tag object containing either a "raw" or "native property."
   * The raw timestamp must conform to the NTP standard representation, consisting of two unsigned int32
   * values. The first represents the number of seconds since January 1, 1900; the second, fractions of a second.
   * "Native" JavaScript timestamps are specified as a Number representing milliseconds since January 1, 1970.
   *
   * @param {Object} timeTag time tag object containing either a native JS timestamp (in ms) or a NTP timestamp pair
   * @return {Uint8Array} raw bytes for the written time tag
   */
  writeTimeTag(timeTag: TimeTag): Uint8Array;

  /**
   * Produces a time tag containing a raw NTP timestamp
   * relative to now by the specified number of seconds.
   *
   * @param {Number} secs the number of seconds relative to now (i.e. + for the future, - for the past)
   * @param {Number} now the number of milliseconds since epoch to use as the current time. Defaults to Date.now()
   * @return {Object} the time tag
   */
  timeTag(secs: number, now: number): RawTimeTag;

  /**
   * Converts OSC's standard time tag representation (which is the NTP format)
   * into the JavaScript/UNIX format in milliseconds.
   *
   * @param {Number} secs1900 the number of seconds since 1900
   * @param {Number} frac the number of fractions of a second (between 0 and 2^32)
   * @return {Number} a JavaScript-compatible timestamp in milliseconds
   */
  ntpToJSTime(secs1900: number, frac: number): number;

  jsToNTPTime(jsTime: number): NTPTime;

  /**
   * Reads the argument portion of an OSC message.
   *
   * @param {DataView} dv a DataView instance to read from
   * @param {Object} offsetState the offsetState object that stores the current offset into dv
   * @param {Object} [options] read options
   * @return {Array} an array of the OSC arguments that were read
   */
  readArguments(dv: DataView, options: { metadata?: false }, offsetState: OffsetState): Argument[];
  readArguments(dv: DataView, options: { metadata: true }, offsetState: OffsetState): ReadArgumentWithMetadata[];

  /**
   * Writes the specified arguments.
   *
   * @param {Array} args an array of arguments
   * @param {Object} options options for writing
   * @return {Uint8Array} a buffer containing the OSC-formatted argument type tag and values
   */
  writeArguments(args: ReadonlyArray<Argument>, options: { metadata?: false }): Uint8Array;
  writeArguments(args: ReadonlyArray<WriteArgumentWithMetadata>, options: { metadata: true }): Uint8Array;

  /**
   * Reads an OSC message.
   *
   * @param {Array-like} data an array of bytes to read from
   * @param {Object} [options] read options
   * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
   * @return {Object} the OSC message, formatted as a JavaScript object containing "address" and "args" properties
   */
  readMessage(
    data: DataViewData,
    options?: { unpackSingleArgs?: false; metadata?: false },
    offsetState?: OffsetState
  ): Message<Argument>;
  readMessage(
    data: DataViewData,
    options: { unpackSingleArgs?: false; metadata: true },
    offsetState?: OffsetState
  ): Message<ReadArgumentWithMetadata>;
  readMessage(
    data: DataViewData,
    options: { unpackSingleArgs: true; metadata?: false },
    offsetState?: OffsetState
  ): SingleByteMessage<Argument>;
  readMessage(
    data: DataViewData,
    options: { unpackSingleArgs: true; metadata: true },
    offsetState?: OffsetState
  ): SingleByteMessage<ReadArgumentWithMetadata>;

  /**
   * Writes an OSC message.
   *
   * @param {Object} msg a message object containing "address" and "args" properties
   * @param {Object} [options] write options
   * @return {Uint8Array} an array of bytes containing the OSC message
   */
  writeMessage(msg: Message<Argument> | SingleByteMessage<Argument>, options?: { metadata?: false }): Uint8Array;
  writeMessage(
    msg: Message<WriteArgumentWithMetadata> | SingleByteMessage<WriteArgumentWithMetadata>,
    options: { metadata: true }
  ): Uint8Array;

  /**
   * Reads an OSC bundle.
   *
   * @param {DataView} dv the DataView instance to read from
   * @param {Object} [options] read optoins
   * @param {Object} [offsetState] an offsetState object that stores the current offset into dv
   * @return {Object} the bundle or message object that was read
   */
  readBundle(
    dv: DataView,
    options?: { unpackSingleArgs?: false; metadata?: false },
    offsetState?: OffsetState
  ): ReadBundle<Argument, Message<Argument>>;
  readBundle(
    dv: DataView,
    options: { unpackSingleArgs?: false; metadata: true },
    offsetState?: OffsetState
  ): ReadBundle<ReadArgumentWithMetadata, Message<ReadArgumentWithMetadata>>;
  readBundle(
    dv: DataView,
    options: { unpackSingleArgs: true; metadata?: false },
    offsetState?: OffsetState
  ): ReadBundle<Argument, SingleByteMessage<Argument>>;
  readBundle(
    dv: DataView,
    options: { unpackSingleArgs: true; metadata: true },
    offsetState?: OffsetState
  ): ReadBundle<ReadArgumentWithMetadata, SingleByteMessage<ReadArgumentWithMetadata>>;

  /**
   * Writes an OSC bundle.
   *
   * @param {Object} a bundle object containing "timeTag" and "packets" properties
   * @param {object} [options] write options
   * @return {Uint8Array} an array of bytes containing the message
   */
  writeBundle(
    bundle: WriteBundle<Argument, Message<Argument>>,
    options?: { unpackSingleArgs?: false; metadata?: false },
    offsetState?: OffsetState
  ): Uint8Array;
  writeBundle(
    bundle: WriteBundle<WriteArgumentWithMetadata, Message<WriteArgumentWithMetadata>>,
    options: { unpackSingleArgs?: false; metadata: true },
    offsetState?: OffsetState
  ): Uint8Array;
  writeBundle(
    bundle: WriteBundle<Argument, SingleByteMessage<Argument>>,
    options: { unpackSingleArgs: true; metadata?: false },
    offsetState?: OffsetState
  ): Uint8Array;
  writeBundle(
    bundle: WriteBundle<WriteArgumentWithMetadata, SingleByteMessage<WriteArgumentWithMetadata>>,
    options: { unpackSingleArgs: true; metadata: true },
    offsetState?: OffsetState
  ): Uint8Array;

  /**
   * Reads an OSC packet, which may consist of either a bundle or a message.
   *
   * @param {Array-like} data an array of bytes to read from
   * @param {Object} [options] read options
   * @return {Object} a bundle or message object
   */
  readPacket(
    data: DataViewData,
    options?: { unpackSingleArgs?: false; metadata?: false },
    offsetState?: OffsetState,
    len?: number
  ): ReadPacket<Argument, Message<Argument>>;
  readPacket(
    data: DataViewData,
    options: { unpackSingleArgs?: false; metadata: true },
    offsetState?: OffsetState,
    len?: number
  ): ReadPacket<ReadArgumentWithMetadata, Message<ReadArgumentWithMetadata>>;
  readPacket(
    data: DataViewData,
    options: { unpackSingleArgs: true; metadata?: false },
    offsetState?: OffsetState,
    len?: number
  ): ReadPacket<Argument, SingleByteMessage<Argument>>;
  readPacket(
    data: DataViewData,
    options: { unpackSingleArgs: true; metadata: true },
    offsetState?: OffsetState,
    len?: number
  ): ReadPacket<ReadArgumentWithMetadata, SingleByteMessage<ReadArgumentWithMetadata>>;

  /**
   * Writes an OSC packet, which may consist of either of a bundle or a message.
   *
   * @param {Object} a bundle or message object
   * @param {Object} [options] write options
   * @return {Uint8Array} an array of bytes containing the message
   */
  writePacket(
    bundle: WritePacket<Argument, Message<Argument>>,
    options?: { unpackSingleArgs?: false; metadata?: false },
    offsetState?: OffsetState
  ): Uint8Array;
  writePacket(
    bundle: WritePacket<WriteArgumentWithMetadata, Message<WriteArgumentWithMetadata>>,
    options: { unpackSingleArgs?: false; metadata: true },
    offsetState?: OffsetState
  ): Uint8Array;
  writePacket(
    bundle: WritePacket<Argument, SingleByteMessage<Argument>>,
    options: { unpackSingleArgs: true; metadata?: false },
    offsetState?: OffsetState
  ): Uint8Array;
  writePacket(
    bundle: WritePacket<WriteArgumentWithMetadata, SingleByteMessage<WriteArgumentWithMetadata>>,
    options: { unpackSingleArgs: true; metadata: true },
    offsetState?: OffsetState
  ): Uint8Array;
}
