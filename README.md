# React-Native Monitoring


<div class="alert alert-warning">
This feature is in open beta. Contact <a href="https://docs.datadoghq.com/help/">Support</a> to ask questions or to provide feedback on this feature.
</div>

Datadog *Real User Monitoring (RUM)* enables you to visualize and analyze the real-time performance and user journeys of your application’s individual users.

## Setup

To install with NPM, run:

```sh
npm install @datadog/reactnative-sdk
```

To install with Yarn, run:

```sh
yarn add @datadog/reactnative-sdk
```

**Minimum React Native version**: SDK supports React Native version 0.63.4 or higher. Compatibility with older versions is not guaranteed out of the box.

### Specify application details in UI

1. In the [Datadog app][1], select **UX Monitoring > RUM Applications > New Application**.
2. Choose `react-native` as your Application Type.
3. Provide a new application name to generate a unique Datadog application ID and client token.

![image][2]

To ensure the safety of your data, you must use a client token. You cannot use only [Datadog API keys][3] to configure the `dd-sdk-reactnative` library, because they would be exposed client-side. For more information about setting up a client token, see the [Client Token documentation][4].

### Initialize the library with application context

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration } from 'dd-sdk-reactnative';


const config = new DdSdkReactNativeConfiguration(
    "<CLIENT_TOKEN>", 
    "<ENVIRONMENT_NAME>", 
    "<RUM_APPLICATION_ID>",
    true, // track User interactions (e.g.: Tap on buttons. You can use 'accessibilityLabel' element property to give tap action the name, otherwise element type will be reported)
    true, // track XHR Resources
    true // track Errors
)
// Optional: Select your Datadog website (one of "US", "EU" or "GOV")
config.site = "US"
// Optional: enable or disable native crash reports
config.nativeCrashReportEnabled = true
// Optional: sample RUM sessions (here, 80% of session will be sent to Datadog. Default = 100%)
config.sampleRate = 80

await DdSdkReactNative.initialize(config)

// Once SDK is initialized you need to setup view tracking to be able to see data in the RUM Dashboard.
```

## Track view navigation

**Note**: Automatic View tracking relies on the [React Navigation](https://reactnavigation.org/) package (minimum supported version is `react-navigation/native@5.6.0`). If you use another package to handle navigation in your application, use the manual instrumentation method described below.

### Setup

To install with NPM, run:

```sh
npm install @datadog/reactnative-sdk-react-navigation
```

To install with Yarn, run:

```sh
yarn add @datadog/reactnative-sdk-react-navigation
```

### Usage

To track changes in navigation as RUM Views, set the `onready` callback of your `NavigationContainer` component:

```js
import * as React from 'react';
import { DdRumReactNavigationTracking } from 'dd-sdk-reactnative';

function App() {
  const navigationRef = React.useRef(null);
  return (
    <View>
      <NavigationContainer ref={navigationRef} onReady={() => {
        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current)
      }}>
        // …
      </NavigationContainer>
    </View>
  );
}
```
**Note**: Only one `NavigationContainer` can be tracked at the time. If you need to track another container, stop tracking previous one first.

## Track custom attributes

You can attach user information to all RUM events to get more detailed information from your RUM sessions. 

### User information

For user-specific information, use the following code wherever you want in your app (after the SDK has been initialized). The `id`, `name`, and `email` attributes are built into Datadog, and you can add other attributes that makes sense for your app.

```js
DdSdkReactNative.setUser({
    id: "1337", 
    name: "John Smith", 
    email: "john@example.com", 
    type: "premium"
})
```

### Global attributes

You can also keep global attributes to track information about a specific session, such as A/B testing configuration, ad campaign origin, or cart status.

```js
DdSdkReactNative.setAttributes({
    profile_mode: "wall",
    chat_enabled: true,
    campaign_origin: "example_ad_network"
})
```

## Manual instrumentation

If automatic instrumentation doesn't suit your needs, you can manually create RUM Events and Logs:

```js
import { DdSdkReactNative, DdSdkReactNativeConfiguration, DdLogs, DdRum } from 'dd-sdk-reactnative';

// Initialize the SDK
const config = new DdSdkReactNativeConfiguration(
    "<CLIENT_TOKEN>",
    "<ENVIRONMENT_NAME>",
    "<RUM_APPLICATION_ID>",
    true, // track User interactions (e.g.: Tap on buttons)
    true, // track XHR Resources
    true // track Errors
)
DdSdkReactNative.initialize(config);

// Send logs (use the debug, info, warn or error methods)
DdLogs.debug("Lorem ipsum dolor sit amet…", 0, {});
DdLogs.info("Lorem ipsum dolor sit amet…", 0, {});
DdLogs.warn("Lorem ipsum dolor sit amet…", 0, {});
DdLogs.error("Lorem ipsum dolor sit amet…", 0, {});

// Track RUM Views manually
DdRum.startView('<view-key>', 'View Url', Date.now(), {});
//…
DdRum.stopView('<view-key>', Date.now(), { 'custom': 42 });

// Track RUM Actions manually
DdRum.addAction('TAP', 'button name', Date.now(), {});
// or in case of continuous action
DdRum.startAction('TAP', 'button name', Date.now(), {});
// to stop action above
DdRum.stopAction(Date.now(), {});

// Add custom timings
DdRum.addTiming('<timing-name>');

// Track RUM Errors manually
DdRum.addError('<message>', 'source', '<stacktrace>', Date.now(), {});

// Track RUM Resource manually
DdRum.startResource('<res-key>', 'GET', 'http://www.example.com/api/v1/test', Date.now(), {} );
//…
DdRum.stopResource('<res-key>', 200, 'xhr', Date.now(), {});

// Send spans manually
const spanId = await DdTrace.startSpan("foo", Date.now(), { 'custom': 42 });
//...
DdTrace.finishSpan(spanId, Date.now(), { 'custom': 21 });
```

## Resource timings

Resource tracking is able to provide the following timings:

* `First Byte` - The time between the scheduled request and the first byte of the response. This includes time for the request preparation on the native level, network latency, and the time it took the server to prepare the response.
* `Download` - The time it took to receive a response.

## License

[Apache License, v2.0](LICENSE)

## Further Reading

{{< partial name="whats-next/whats-next.html" >}}

[1]: https://app.datadoghq.com/rum/application/create
[2]: https://raw.githubusercontent.com/DataDog/dd-sdk-reactnative/main/docs/image_reactnative.png
[3]: https://docs.datadoghq.com/account_management/api-app-keys/#api-keys
[4]: https://docs.datadoghq.com/account_management/api-app-keys/#client-tokens
