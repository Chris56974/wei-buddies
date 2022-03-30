import { app } from './app';

const PORT = 3000;

const init = () => {
  if (!process.env.JWT_KEY) throw new Error("Can't find the JWT_KEY");
  if (!process.env.PGHOST) throw new Error("Can't find PGHOST");
  setInterval(() => {
    console.log(process.env.FOO);
  }, 2000);
};

init();

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}!`);
});
