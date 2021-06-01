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
        msg.content = msg.content.replace(/```(.|\n)*?```/g, m => {
          const lines = m.split("\n");
          if (lines.length < 2) return m; // Do not affect inline codeblocks
          let suffix = "";
          if (lines[lines.length - 1] === "```") suffix = lines.pop();
          return `${lines[0]}\n${this.unindent(lines.slice(1).join("\n"))}\n${suffix}`;
        });
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
        args[0].content = this.unindent(args[0].content);
        return args;
      },
      true
    );
  }

  unindent(str) {
    // Users cannot send tabs, they get converted to spaces. However, a bot may send tabs, so convert them to 4 spaces first
    str = str.replace(/\t/g, "    ");
    const minIndent = str.match(/^ *(?=\S)/gm)?.reduce((prev, curr) => Math.min(prev, curr.length), Infinity) ?? 0;
    if (!minIndent) return str;
    return str.replace(new RegExp(`^ {${minIndent}}`, "gm"), "");
  }

  pluginWillUnload() {
    uninject(sendMessageInjectionId);
    uninject(codeblockInjectionId);
  }
};
