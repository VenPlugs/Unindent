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
const { messages } = require("powercord/webpack");

const indents = [, " ", "\t"];

const injectionId = "unindentCodeblocks";

module.exports = class Unindent extends Plugin {
  startPlugin() {
    inject(injectionId, messages, "sendMessage", async args => {
      const msg = args[1];
      msg.content = msg.content.replace(/```(.|\n)*?```/g, m => {
        const lines = m.split("\n");

        // First line sometimes (?) has no indent (thanks discord), so use the second line as reference in these cases
        let choseSecondLine = false;
        let firstIndentedLine;
        if (indents.indexOf(lines[1].charAt(0)) === -1) {
          firstIndentedLine = lines[2];
          choseSecondLine = true;
        } else {
          firstIndentedLine = lines[1];
        }

        if (!firstIndentedLine) return m;

        let indentAmount = 0;
        for (const char of firstIndentedLine) {
          const idx = indents.indexOf(char);
          if (idx === -1) break;
          indentAmount += idx;
        }

        // FIXME (Find less hacky solution): If indent amount is based on second line, try to figure out it is in block (thus indented further) and if so leave additional indent
        if (
          choseSecondLine &&
          (lines[1].includes("{") || lines[1].endsWith(":") || lines[1].endsWith("; then") || firstIndentedLine.indexOf("{") === indentAmount + 1)
        )
          indentAmount -= 2;

        if (indentAmount <= 0) return m;

        for (let i = 1; i < lines.length; i++) {
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
      });
      return args;
    });
  }

  pluginWillUnload() {
    uninject(injectionId);
  }
};
