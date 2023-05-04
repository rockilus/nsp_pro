"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var ConfigDialog_1 = __importDefault(require("./ConfigDialog"));
function Home() {
    return (<div>
      <ConfigDialog_1.default />
    </div>);
}
exports.default = Home;
