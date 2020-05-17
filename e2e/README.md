# Integration tests

Those tests use [CodeceptJS](https://codecept.io/).

## Install

Install the dependencies with `yarn`, and then run the tests:

## Run & Use

```
yarn run codeceptjs run -p screenshotOnFail --steps
```

If any of the tests fail, a screenshot will be saved to `_output/`.

By default the tests will run in Chromium. A different browser can be chosen by exporting the `BROWSER` environment variable. Valid values are `chromium`, `firefox` and `webkit`.

# Develop tests

- [Pause execution & debug](https://codecept.io/basics/#pause)
- [Matchers](https://codecept.io/helpers/Playwright/#fillfield) (in Playwright)
