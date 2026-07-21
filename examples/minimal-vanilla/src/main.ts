import { run } from './index';

run()
  .then((r) => {
    console.log(
      `[minimal-vanilla] element=${r.element} parking=${r.parkingCount} noiseBuckets=${r.noiseBuckets}`,
    );
  })
  .catch((err: unknown) => {
    console.error(err);
  });
