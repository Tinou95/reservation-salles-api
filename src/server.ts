import { createApp } from './app';
import { sequelize } from './models';

const port = Number(process.env.PORT ?? 3000);

sequelize.sync().then(() => {
  createApp().listen(port, () => console.log(`http://localhost:${port}`));
});
