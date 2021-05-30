/*
 * Unindent, a Powercord Plugin to trim unnecessary indent from messages
 * Copyright (C) 2021 Vendicated
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { Plugin } = require("powercord/entities");
const { inject, uninject } = require("powercord/injector");
const { messages, getModule } = require("powercord/webpack");

const indents = [, " ", "\t"];

const sendMessageInjectionId = "unindentSendMessage";
const codeblockInjectionId = "unindentCodeblocks";

module.exports = class Unindent extends Plugin {
  async startPlugin() {
    inject(
      sendMessageInjectionId,
      messages,
      "sendMessage",
      args => {
        const msg = args[1];
        msg.content = msg.content.replace(/```(.|\n)*?```/g, m => this.unindent(m, 1));
        return args;
      },
      true
    );

    const parser = await getModule(["parse", "parseTopic"]);

    inject(
      codeblockInjectionId,
      parser.defaultRules.codeBlock,
      "react",
      args => {
        args[0].content = this.unindent(args[0].content, 0);
        return args;
      },
      true
    );
  }

  unindent(str, firstLineIdx) {
    const lines = str.split("\n");
    // First line sometimes (?) has no indent (thanks discord), so use the second line as reference in these cases
    let choseSecondLine = false;
    let firstIndentedLine;
    if (indents.indexOf(lines[firstLineIdx].charAt(0)) === -1) {
      firstIndentedLine = lines[firstLineIdx + 1];
      choseSecondLine = true;
    } else {
      firstIndentedLine = lines[firstLineIdx];
    }

    if (!firstIndentedLine) return str;

    let indentAmount = 0;
    for (const char of firstIndentedLine) {
      const idx = indents.indexOf(char);
      if (idx === -1) break;
      indentAmount += idx;
    }

    // FIXME (Find less hacky solution): If indent amount is based on second line, try to figure out it is in block (thus indented further) and if so leave additional indent
    if (
      choseSecondLine &&
      (lines[firstLineIdx].includes("{") ||
        lines[firstLineIdx].endsWith(":") ||
        lines[firstLineIdx].endsWith("; then") ||
        firstIndentedLine.indexOf("{") === indentAmount + 1)
    )
      indentAmount -= 2;

    if (indentAmount <= 0) return str;

    for (let i = firstLineIdx; i < lines.length; i++) {
      const line = lines[i];
      let unindentedIdx = 0;
      for (let j = 0, unindentedAmount = 0; j < line.length; j++) {
        const char = line[j];
        const idx = indents.indexOf(char);
        if (idx === -1) break;
        unindentedIdx++;
        unindentedAmount += idx;
        if (unindentedAmount >= indentAmount) break;
      }
      lines[i] = line.slice(unindentedIdx);
    }

    return lines.join("\n");
  }

  pluginWillUnload() {
    uninject(sendMessageInjectionId);
    uninject(codeblockInjectionId);
  }
};
