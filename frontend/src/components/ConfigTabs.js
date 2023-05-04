"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var api_1 = require("../services/api");
var OptionBlock_1 = require("./OptionBlock");
var Tabs_1 = require("@mui/material/Tabs");
var Tab_1 = require("@mui/material/Tab");
var Box_1 = require("@mui/material/Box");
function TabPanel(props) {
    var children = props.children, value = props.value, index = props.index, other = __rest(props, ["children", "value", "index"]);
    return (<div role="tabpanel" hidden={value !== index} id={"simple-tabpanel-".concat(index)} aria-labelledby={"simple-tab-".concat(index)} {...other}>
      {value === index && <Box_1.default sx={{ p: 3 }}>{children}</Box_1.default>}
    </div>);
}
function a11yProps(index) {
    return {
        id: "simple-tab-".concat(index),
        "aria-controls": "simple-tabpanel-".concat(index),
    };
}
function ConfigTabs() {
    var _a = react_1.default.useState(0), value = _a[0], setValue = _a[1];
    var _b = (0, react_1.useState)({}), hospitalProfile = _b[0], setHospitalProfile = _b[1];
    var _c = (0, react_1.useState)(""), error = _c[0], setError = _c[1];
    var handleChange = function (event, newValue) {
        setValue(newValue);
    };
    (0, react_1.useEffect)(function () {
        function fetchDataAsync() {
            return __awaiter(this, void 0, void 0, function () {
                var jsonData, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, (0, api_1.fetchHospitalProfile)()];
                        case 1:
                            jsonData = _a.sent();
                            setHospitalProfile(jsonData);
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            setError(error_1.message);
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            });
        }
        fetchDataAsync();
    }, []);
    return (<Box_1.default sx={{ width: "100%" }}>
      <Box_1.default sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs_1.default value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab_1.default label="Hospital Profile" {...a11yProps(0)}/>
          <Tab_1.default label="Doctors Profile" {...a11yProps(1)}/>
          <Tab_1.default label="Parameters" {...a11yProps(2)}/>
        </Tabs_1.default>
      </Box_1.default>
      <TabPanel value={value} index={0}>
        <OptionBlock_1.default />
        {/* <Typography variant="h6" gutterBottom>
          Duty Options
        </Typography>
        <Typography variant="h6" gutterBottom>
          Human Resources
        </Typography> */}
      </TabPanel>
      <TabPanel value={value} index={1}>
        Item Two
      </TabPanel>
      <TabPanel value={value} index={2}>
        Item Three
      </TabPanel>
    </Box_1.default>);
}
exports.default = ConfigTabs;
