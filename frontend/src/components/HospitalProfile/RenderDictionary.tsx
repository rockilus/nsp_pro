import React from "react";

import OptionBlock from "./OptionBlock";

function formatKey(inputKeys: string[]): string {
  return inputKeys.join("/");
}

type MyDictionary = {
  [key: string]: string | MyDictionary;
};

type Props = {
  dict: MyDictionary;
  indentLevel: number;
};

const INDENT_SIZE = 20;

export default function renderDictionary(
  dict: MyDictionary,
  indentLevel: number,
  dictPath: string[]
): React.ReactNode {
  const indent = {
    marginLeft: `${indentLevel * INDENT_SIZE}px`,
  };

  return (
    <>
      {Object.entries(dict).map(([key, value]) => {
        const newDictPath = [...dictPath, key];
        const keyString = formatKey(newDictPath);
        if (typeof value === "string" || typeof value === "number") {
          return (
            <div key={keyString}>
              <OptionBlock
                inputString={key}
                marginPx={indentLevel * INDENT_SIZE}
                dictPath={newDictPath}
              />
              <OptionBlock
                inputString={value}
                marginPx={(indentLevel + 1) * INDENT_SIZE}
                dictPath={[...newDictPath, value]}
              />
            </div>
          );
        } else if (Array.isArray(value)) {
          return (
            <div key={keyString}>
              <OptionBlock
                inputString={key}
                marginPx={indentLevel * INDENT_SIZE}
                dictPath={newDictPath}
              />
              {value.map((item) => {
                const newItemDictPath = [...newDictPath, item];
                const itemKeyString = formatKey(newItemDictPath);
                return (
                  <div key={itemKeyString}>
                    <OptionBlock
                      inputString={item}
                      marginPx={(indentLevel + 1) * INDENT_SIZE}
                      dictPath={newItemDictPath}
                    />
                  </div>
                );
              })}
            </div>
          );
        } else if (typeof value === "object") {
          return (
            <div key={keyString}>
              <OptionBlock
                inputString={key}
                marginPx={indentLevel * INDENT_SIZE}
                dictPath={newDictPath}
              />
              {renderDictionary(value, indentLevel + 1, newDictPath)}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}
