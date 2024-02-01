import Home from "../containers/Home";
import { StyledEngineProvider } from '@mui/material/styles';


export default function App() {
  return (
    <>
      <StyledEngineProvider injectFirst>
        <Home />
      </StyledEngineProvider>
    </>
  );
}
