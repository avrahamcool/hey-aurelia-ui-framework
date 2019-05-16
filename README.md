# Aurelia UI Framework

#### A bespoke UI Framework built on Aurelia for desktop business application

Instructions:
temporarly change the package name to `aurelia-ui-framework`,
run yarn link
run yarn link aurelia-ui-framework

make changes.

run yarn build:source
run yarn unlink aurelia-ui-framework
run yarn
change the package name to `hey-aurelia-ui-framework`,
publish

[![npm version](https://img.shields.io/npm/v/aurelia-ui-framework.svg?style=flat-square)](https://www.npmjs.com/package/aurelia-ui-framework)
[![npm downloads](https://img.shields.io/npm/dt/aurelia-ui-framework.svg?style=flat-square)](https://www.npmjs.com/package/aurelia-ui-framework)
[![license](https://img.shields.io/github/license/adarshpastakia/aurelia-ui-framework.svg?style=flat-square)](https://github.com/adarshpastakia/aurelia-ui-framework/blob/master/LICENSE)
[![Travis](https://img.shields.io/travis/adarshpastakia/aurelia-ui-framework.svg?style=flat-square)](https://travis-ci.org/adarshpastakia/aurelia-ui-framework)
[![David](https://img.shields.io/david/adarshpastakia/aurelia-ui-framework.svg?style=flat-square)](https://github.com/adarshpastakia/aurelia-ui-framework)

[![GitHub stars](https://img.shields.io/github/stars/adarshpastakia/aurelia-ui-framework.svg?style=social&label=Star)](https://github.com/adarshpastakia/aurelia-ui-framework/stargazers)
[![GitHub watchers](https://img.shields.io/github/watchers/adarshpastakia/aurelia-ui-framework.svg?style=social&label=Watch)](https://github.com/adarshpastakia/aurelia-ui-framework/watchers)
[![GitHub issues](https://img.shields.io/github/issues/adarshpastakia/aurelia-ui-framework.svg?style=social&label=Issues)](https://github.com/adarshpastakia/aurelia-ui-framework/issues)
[![GitHub closed issues](https://img.shields.io/github/issues-closed/adarshpastakia/aurelia-ui-framework.svg?style=social&label=Closed%20Issues)](https://github.com/adarshpastakia/aurelia-ui-framework/issues?q=is%3Aissue+is%3Aclosed)


---

### Browser Support

|![Safari](http://i66.tinypic.com/2db3ypv.png)|![Chrome](http://i65.tinypic.com/5v0ff6.png)|![Opera](http://i64.tinypic.com/1z4y452.png)|![Firefox](http://i68.tinypic.com/2cgorw3.png)|![Edge](http://i65.tinypic.com/ebcupt.png)|
|:---:|:---:|:---:|:---:|:---:|
|Safari|Chrome|Opera|Firefox|Edge|
|>10.0|>49.0|>42.0|>51.0|>13.0|


### Demo

https://adarshpastakia.github.io/aurelia-ui-framework

### Demo for version 3

https://adarshpastakia.github.io/auf-demo-v3

---


### Framework Dependencies

###### Aurelia (http://aurelia.io)
  * aurelia-bootstrapper
  * aurelia-event-aggregator
  * aurelia-fetch-client
  * aurelia-framework
  * aurelia-logging
  * aurelia-metadata
  * aurelia-router
  * aurelia-templating-resources
  * aurelia-validation
  * aurelia-ui-virtualization

###### Other JS Utilities
  * lodash (http://lodash.com)
  * moment (http://momentjs.com)
  * numeral (http://numeraljs.com)
  * kramed (https://www.npmjs.com/package/kramed)


### Building The Code

1. Ensure NodeJs and Git is installed

2. Clone the project `v4-dev` branch from GitHub
  ```shell
  git clone https://github.com/adarshpastakia/aurelia-ui-framework.git
  ```

3. From project folder execute the following commands

4. Install npm module dependencies
  ```shell
  yarn install
  ```
4. Build the framework source
  ```shell
  yarn build:source
  ```

> Use `npm` in place of `yarn` if preferable


### Using The Framework via Local Link

1. Create a npm link
  ```shell
  yarn link
  ```

2. Use the framework in your application
  ```shell
  yarn link aurelia-ui-framework
  ```

> NOTE: Ensure that the `auf-utility-library` module dependency is also added

### Running The Demo Application

1. Run the application
  ```shell
  yarn start
  ```

2. Browse the application on `http://localhost:9000`
