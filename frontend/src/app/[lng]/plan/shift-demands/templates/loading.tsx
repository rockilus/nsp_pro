import { Container, Box, CircularProgress } from "@mui/material";

export default function Loading() {
  return (
    <Container>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress />
      </Box>
    </Container>
  );
}
