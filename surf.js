/*
 * Copyright © 2018 GlobalMentor, Inc. <http://www.globalmentor.com/>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const StringBuffer = require("string-buffer");

/**Make `StringBuffer` an "appendable".*/
StringBuffer.prototype.append = StringBuffer.prototype.write;

//TODO detect Node.js and use node-stringbuilder if faster

/*
 * Simple URF (SURF) document format parser and serializer.
 * @author Garret Wilson
 */

/**The specification of the SURF format.*/
const SPEC = Object.freeze(function() {
  const spec = {};
  /** The delimiter that begins and ends character literal representations. */
  spec.CHARACTER_DELIMITER = '\''.charCodeAt(0);
  /** The character used for escaping a character. */
  spec.CHARACTER_ESCAPE = '\\'.charCodeAt(0);
  /** Characters that must be escaped as characters or in strings. */
  spec.CHARACTER_REQUIRED_ESCAPED_CHARACTERS = "\\\b\f\n\r\t\v";
  /** Additional characters that may be escaped as characters or in strings. */
  spec.CHARACTER_OPTIONAL_ESCAPED_CHARACTERS = "/";
  //escaped forms of characters
  spec.ESCAPED_BACKSPACE = 'b'.charCodeAt(0); //b backspace
  spec.ESCAPED_FORM_FEED = 'f'.charCodeAt(0); //f form feed
  spec.ESCAPED_LINE_FEED = 'n'.charCodeAt(0); //n line feed
  spec.ESCAPED_CARRIAGE_RETURN = 'r'.charCodeAt(0); //r carriage return
  spec.ESCAPED_TAB = 't'.charCodeAt(0); //t tab
  spec.ESCAPED_VERTICAL_TAB = 'v'.charCodeAt(0); //v vertical tab
  spec.ESCAPED_UNICODE = 'u'.charCodeAt(0); //u Unicode
  return spec;
}());

/**
 * Parses a JSON string into an object.
 * @param text The string to parse.
 * @return An object, which may be `null`, or an object graph.
 */
exports.parse = (value) => {
  throw new Error(`Parsing of value ${value} not yet supported.`);
};

/**
 * Converts a value to SURF.
 * @param value The value to convert.
 * @return The value serialized as SURF.
 */
exports.stringify = (value) => {
  return new Serializer().serialize(value);
};

/**
 * Simple parser for the Simple URF (SURF) document format.
 * <p>
 * This parser is meant to be used once for parsing a single SURF document. It should not be used to parse multiple documents, as it maintains parsing state.
 * </p>
 * <p>
 * The parser should be released after use so as not to leak memory of parsed resources when resources are present with tags/IDs/aliases.
 * </p>
 * @author Garret Wilson
 */
class Parser {

  /**
   * Parses a character as content, without any delimiters. The current position must be that of the character, which may be an escape sequence. The new
   * position will be that immediately after the character.
   * <p>
   * This method always allows the delimiter to be escaped.
   * </p>
   * @param reader The reader the contents of which to be parsed.
   * @param delimiter The char code of the delimiter that surrounds the character and which should be escaped.
   * @return The code point parsed from the reader, or `-1` if the unescaped delimiter was encountered.
   * @throws ParseError if a control character was represented, if the character is not escaped correctly, or the reader has no more characters before the
   *           current character is completely parsed.
   */
  parseCharacterCodePoint(reader, delimiter) {
    let c = reader.readRequired; //read a character
    //TODO check for and prevent control characters
    if (c == delimiter) {
      return -1;
    } else if (c == SPEC.CHARACTER_ESCAPE) { //if this is an escape character
      c = reader.readRequired; //read another a character
      switch (c) { //see what the next character
        case SPEC.CHARACTER_ESCAPE: //\\
        case SPEC.SOLIDUS_CHAR: //\/
          break; //use the escaped escape character unmodified
        case SPEC.ESCAPED_BACKSPACE: //\b backspace
          c = SPEC.BACKSPACE_CHAR;
          break;
        case SPEC.ESCAPED_FORM_FEED: //\f
          c = SPEC.FORM_FEED_CHAR;
          break;
        case SPEC.ESCAPED_LINE_FEED: //\n
          c = SPEC.LINE_FEED_CHAR;
          break;
        case SPEC.ESCAPED_CARRIAGE_RETURN: //\r
          c = SPEC.CARRIAGE_RETURN_CHAR;
          break;
        case SPEC.ESCAPED_TAB: //\t
          c = SPEC.CHARACTER_TABULATION_CHAR;
          break;
        case SPEC.ESCAPED_VERTICAL_TAB: //\v
          c = SPEC.LINE_TABULATION_CHAR;
          break;
        case SPEC.ESCAPED_UNICODE: //u Unicode
          {
            const unicodeString = reader.readRequiredCount(4); //read the four Unicode code point hex characters
            c = Number.parseInt(unicodeString, 16); //parse the hex characters and use the resulting code point
            if (Number.isNaN(c)) { //if the hex integer was not in the correct format
              throw new ParseError(`Invalid Unicode escape sequence ${unicodeString}.`);
            }
            if (c >= 0xD800 && c <= 0xDBFF) { //if this is a high surrogate, expect another Unicode escape sequence TODO create isHighSurrogate() method
              reader.check(SPEC.CHARACTER_ESCAPE); //\
              reader.check(SPEC.ESCAPED_UNICODE); //u
              const unicodeString2 = reader.readRequiredCount(4);
              const c2 = Number.parseInt(unicodeString2, 16);
              if (Number.isNaN(c2)) { //if the hex integer was not in the correct format
                throw new ParseError(`Invalid Unicode escape sequence ${unicodeString2}.`);
              }
              /*TODO; see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/codePointAt
					if(!Character.isLowSurrogate(c2)) {
						throw new ParseIOException(reader, "Unicode high surrogate character " + Characters.getLabel(c)
								+ " must be followed by low surrogate character; found " + Characters.getLabel(c2));
					}
          */
              return (c - 0xD800) * 0x400 + c2 - 0xDC00 + 0x10000;
            }
            /*TODO
					if(Character.isLowSurrogate(c)) {
						throw new ParseIOException(reader, "Unicode character escape sequence cannot begin with low surrogate character " + Characters.getLabel(c));
					}
          */
          }
          break;
        default: //if another character was escaped
          if (c != delimiter) { //if this is not the delimiter that was escaped
            throw new ParseError(reader, `Unknown escaped character: ${c}`); //TODO use character label
          }
          break;
      }
    } else if (c >= 0xD800 && c <= 0xDBFF) { //if this is a high surrogate, expect another character TODO create isHighSurrogate() method
      const c2 = reader.readRequired; //read another character
      /*TODO fix
			if(!Character.isLowSurrogate(c2)) {
				throw new ParseIOException(reader,
						"Unicode high surrogate character " + Characters.getLabel(c) + " must be followed by low surrogate character; found " + Characters.getLabel(c2));
			}
      */
      return (c - 0xD800) * 0x400 + c2 - 0xDC00 + 0x10000; //short-circuit and return the surrogate pair code point
      /*TODO fix
      		} else if(Character.isLowSurrogate(c)) {
      			throw new ParseIOException(reader, "Unicode character cannot begin with low surrogate character " + Characters.getLabel(c));
            */
    }
    return c;
  }

}

/**
 * Simple serializer for the Simple URF (SURF) document format.
 * <p>
 * This serializer is meant to be used once for generating a single SURF document. It should not be used to serialize multiple documents, as it maintains
 * serialization state.
 * </p>
 * <p>
 * The serializer should be released after use so as not to leak memory of parsed resources when resources are present with tags/IDs and/or generate aliases.
 * </p>
 * @author Garret Wilson
 */
class Serializer {

  /**
   * Serializes a resource graph to a string.
   * <p>
   * This method discovers resource references to that aliases may be generated as needed. This record of resource references is reset after serialization, but
   * any generated aliases remain. This allows the same serializer to be used multiple times for the same graph, with the same aliases being used.
   * </p>
   * <p>
   * This is a convenience method that delegates to {@link #serializeRoot(appendable, root)}.
   * </p>
   * @param root The root resource, or `null` if there is no resource to serialize.
   * @return A serialized string representation of the given resource graph.
   */
  serialize(root) {
    //TODO discoverResourceReferences(root);
    try {
      const writer = new StringBuffer();
      this.serializeRoot(writer, root);
      return writer.toString();
    } finally {
      //TODO fix			resourceHasReferenceMap.clear();
    }
  }

  /**
   * Serializes a resource graph to some appendable destination.
   * <p>
   * All references to the resources in the graph must have already been discovered if aliases need to be generated.
   * </p>
   * @param appendable The appendable to which serialized data should be appended.
   * @param root The root resource, or `null` if there is no resource to serialize.
   */
  serializeRoot(appendable, root) {
    if (root == null) {
      return;
    }
    this.serializeResource(appendable, root);
  }

  /**
   * Serializes a resource to some appendable destination.
   * <p>
   * All references to the resources in the graph must have already been discovered if aliases need to be generated.
   * </p>
   * @param appendable The appendable to which serialized data should be appended.
   * @param resource The resource to serialize.
   */
  serializeResource(appendable, resource) {
    //TODO
    if (resource === "") {
      appendable.append("\"\"");
      return;
    }
    throw new Error(`Serialization of value ${JSON.stringify(resource)} not yet supported.`);
  }

}


class ParseError extends Error { //TODO consolidate
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseError);
    }
  }
}


exports.SPEC = SPEC;
exports.Parser = Parser;
exports.Serializer = Serializer;
