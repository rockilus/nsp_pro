import React, { useState, useRef, useEffect, useCallback } from "react";

import SentenceItem from "./SentenceItem";
import QuantityItem from "./QuantityItem";

interface SelectorT {
  name: string;
  options: string[];
  selected: string[];
  multiple: boolean;
}

interface Props {
  selectors: SelectorT[];
}

export default function ConstraintSentence({ selectors }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      {selectors.map((selector, index) => (
        <div key={index} style={{ marginRight: "5px" }}>
          {["operator", "shift", "worker", "timing"].includes(selector.name) &&
            (selector.options.length > 1 ? (
              <SentenceItem selector={selector} />
            ) : (
              <div>
                <div className="field-name" style={{ fontSize: "10px" }}>
                  {selector.name.charAt(0).toUpperCase() +
                    selector.name.slice(1)}
                </div>
                <div className="field-value">{selector.selected[0]}</div>
              </div>
            ))}
          {selector.name === "text" && (
            <div>
              <div className="field-name" style={{ height: "15px" }}></div>
              <div className="field-value">{selector.selected[0]}</div>
            </div>
          )}
          {selector.name === "#" && <QuantityItem selector={selector} />}
        </div>
      ))}
    </div>
  );
}
