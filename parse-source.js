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

/*
 * A source of data being parsed, with methods for pulled parsed data.
 * @author Garret Wilson
 */
module.exports = class ParseSource {

  /**
   * Constructor.
   * @param string The string to serve as parse data
   */
  constructor(string) {
    this.buffer = string;
    this.index = 0;
  }

  /**
   * Checks that the current character matches a specific character and advances to the next character.
   * @param charCode The character code against which which the current character should be checked.
   * @return The current character code.
   * @throws ParseUnexpectedDataException if the current character in the reader does not match the specified character.
   * @throws ParseEndException if the reader has no more characters.
   * @see #confirm(char)
   */
  check(charCode) {
    const c = this.readRequired(); //read the next character
    if (c != charCode) { //if this character does not match what we expected
      throw new ParseUnexpectedDataError(charCode, c);
    }
    return c; //return the character read
  }



  /**
   * Checks that the parse source is not at the end of the data.
   * @throws ParseEOFError if there is no more data to parse.
   */
  checkNotEnd() {
    if (this.index >= this.buffer.length) {
      throw new ParseEndError();
    }
  }

  /**
   * Reads a character code, throwing an error if the end of the data was reached.
   * <p>
   * This method is semantically equivalent to calling {@link #readRequiredCount(int)} with a value of <code>1</code>
   * and returning the character code of the resulting string.
   * </p>
   * @return The next character code read.
   * @throws ParseEndError if there are no more characters.
   */
  readRequired() {
    this.checkNotEnd();
    return this.buffer.charCodeAt(this.index++);
  }

  /**
   * Reads a given number of characters, throwing an error if the end of the reader was reached.
   * @param count The number of characters to read.
   * @return The string representing the characters read.
   * @throws ParseEndException if the reader has no more characters.
   */
  readRequiredCount(count) {
    //TODO checkArgumentNotNegative(count); //make sure the count isn't negative
    if (this.index > this.buffer.length - count) {
      throw new ParseEndError();
    }
    const string = this.buffer.slice(this.index, this.index + count);
    this.index += count;
    return string;
  }



};

class ParseError extends Error { //TODO consolidate
  constructor(...params) {
    super(...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseError);
    }
  }
}

class ParseEndError extends ParseError {
  constructor(...params) {
    super("Unexpected end of data.", ...params);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseEndError);
    }
  }
}

class ParseUnexpectedDataError extends ParseError {
  constructor(expected, actual, ...params) {
    super(`Unexpected character: expected ${expected} found ${actual}.`, ...params); //TODO use character "labels"
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseUnexpectedDataError);
    }
  }
}
