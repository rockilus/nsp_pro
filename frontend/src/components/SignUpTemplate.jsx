"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var Avatar_1 = __importDefault(require("@mui/material/Avatar"));
var Button_1 = __importDefault(require("@mui/material/Button"));
var CssBaseline_1 = __importDefault(require("@mui/material/CssBaseline"));
var TextField_1 = __importDefault(require("@mui/material/TextField"));
var FormControlLabel_1 = __importDefault(require("@mui/material/FormControlLabel"));
var Checkbox_1 = __importDefault(require("@mui/material/Checkbox"));
var Link_1 = __importDefault(require("@mui/material/Link"));
var Grid_1 = __importDefault(require("@mui/material/Grid"));
var Box_1 = __importDefault(require("@mui/material/Box"));
var LockOutlined_1 = __importDefault(require("@mui/icons-material/LockOutlined"));
var Typography_1 = __importDefault(require("@mui/material/Typography"));
var Container_1 = __importDefault(require("@mui/material/Container"));
var styles_1 = require("@mui/material/styles");
// test
function Copyright(props) {
    return (<Typography_1.default variant="body2" color="text.secondary" align="center" {...props}>
      {"Copyright © "}
      <Link_1.default color="inherit" href="https://mui.com/">
        Your Website
      </Link_1.default>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography_1.default>);
}
var theme = (0, styles_1.createTheme)();
function SignUp() {
    var handleSubmit = function (event) {
        event.preventDefault();
        var data = new FormData(event.currentTarget);
        console.log({
            email: data.get("email"),
            password: data.get("password"),
        });
    };
    return (<styles_1.ThemeProvider theme={theme}>
      <Container_1.default component="main" maxWidth="xs">
        <CssBaseline_1.default />
        <Box_1.default sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
          <Avatar_1.default sx={{ m: 1, bgcolor: "secondary.main" }}>
            <LockOutlined_1.default />
          </Avatar_1.default>
          <Typography_1.default component="h1" variant="h5">
            Sign up
          </Typography_1.default>
          <Box_1.default component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid_1.default container spacing={2}>
              <Grid_1.default item xs={12} sm={6}>
                <TextField_1.default autoComplete="given-name" name="firstName" required fullWidth id="firstName" label="First Name" autoFocus/>
              </Grid_1.default>
              <Grid_1.default item xs={12} sm={6}>
                <TextField_1.default required fullWidth id="lastName" label="Last Name" name="lastName" autoComplete="family-name"/>
              </Grid_1.default>
              <Grid_1.default item xs={12}>
                <TextField_1.default required fullWidth id="email" label="Email Address" name="email" autoComplete="email"/>
              </Grid_1.default>
              <Grid_1.default item xs={12}>
                <TextField_1.default required fullWidth name="password" label="Password" type="password" id="password" autoComplete="new-password"/>
              </Grid_1.default>
              <Grid_1.default item xs={12}>
                <FormControlLabel_1.default control={<Checkbox_1.default value="allowExtraEmails" color="primary"/>} label="I want to receive inspiration, marketing promotions and updates via email."/>
              </Grid_1.default>
            </Grid_1.default>
            <Button_1.default type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Sign Up
            </Button_1.default>
            <Grid_1.default container justifyContent="flex-end">
              <Grid_1.default item>
                <Link_1.default href="#" variant="body2">
                  Already have an account? Sign in
                </Link_1.default>
              </Grid_1.default>
            </Grid_1.default>
          </Box_1.default>
        </Box_1.default>
        <Copyright sx={{ mt: 5 }}/>
      </Container_1.default>
    </styles_1.ThemeProvider>);
}
exports.default = SignUp;
