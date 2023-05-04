"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var ConfigTabs_1 = require("./ConfigTabs");
var Button_1 = require("@mui/material/Button");
var Dialog_1 = require("@mui/material/Dialog");
var DialogActions_1 = require("@mui/material/DialogActions");
function AlertDialog() {
    var _a = React.useState(false), open = _a[0], setOpen = _a[1];
    var handleClickOpen = function () {
        setOpen(true);
    };
    var handleClose = function () {
        setOpen(false);
    };
    return (<div>
      <Button_1.default variant="outlined" onClick={handleClickOpen}>
        Configuration
      </Button_1.default>
      <Dialog_1.default open={open} onClose={handleClose} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
        <ConfigTabs_1.default />
        <DialogActions_1.default>
          <Button_1.default onClick={handleClose} autoFocus>
            Close
          </Button_1.default>
        </DialogActions_1.default>
      </Dialog_1.default>
    </div>);
}
exports.default = AlertDialog;
