/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import { View, Text, Button, AppState } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { DdRum } from '@datadog/react-native';
import DdRumReactNavigationTracking from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { render, fireEvent } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';

jest.mock('@datadog/react-native', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            startView: jest.fn().mockImplementation(() => { }),
            stopView: jest.fn().mockImplementation(() => { })
        },
    };
});

let capturedAppStateChangeCallback = null;

jest.mock('react-native/Libraries/AppState/AppState', () => ({
    addEventListener: jest.fn((event, callback) => {
        if (event === 'change') {
            capturedAppStateChangeCallback = callback;
        }
    }),
    removeEventListener: jest.fn().mockImplementation(() => { })
}));

const { Screen, Navigator } = createStackNavigator();
const navigationRef1: React.RefObject<NavigationContainerRef> = React.createRef();
const navigationRef2: React.RefObject<NavigationContainerRef> = React.createRef();
const navigationRef3: React.RefObject<NavigationContainerRef> = React.createRef();

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();


beforeEach(() => {
    
    jest.setTimeout(20000);
    DdRum.startView.mockClear();
    DdRum.stopView.mockClear();
    AppState.addEventListener.mockClear();
    AppState.removeEventListener.mockClear();

    DdRumReactNavigationTracking.registeredContainer = null;
    DdRumReactNavigationTracking.navigationStateChangeListener = null;
    DdRumReactNavigationTracking.appStateListener = null;
})

// Unit tests

it('M send a RUM ViewEvent W startTrackingViews', async () => {

    // GIVEN
    render(<FakeNavigator1 />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
})

it('M send a related RUM ViewEvent W switching screens { navigationContainer listener attached }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})

it('M only register once W startTrackingViews{ multiple times }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})

it('M do nothing W switching screens { navigationContainer listener detached }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
})

it('M do nothing W startTrackingViews { undefined NavigationContainerRef ', async () => {

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(null);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(0);
})

it('M send a RUM ViewEvent for each W startTrackingViews { multiple navigation containers w first not detached }', async () => {

    // GIVEN
    const testUtils1: { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton1 = testUtils1.getByText('Go to About');
    const testUtils2: { getByText } = render(<FakeNavigator2 />);
    const goToAboutButton2 = testUtils2.getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    // this call will be ignored, because only one NavigationContainer tracking is supported at the time
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // WHEN
    expect(goToAboutButton1).toBeTruthy();
    expect(goToAboutButton2).toBeTruthy();
    fireEvent(goToAboutButton1, "press");
    fireEvent(goToAboutButton2, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})

it('M send a RUM ViewEvent for each W startTrackingViews { multiple navigation containers w first is detached }', async () => {

    // GIVEN
    const testUtils1: { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton1 = testUtils1.getByText('Go to About');
    const testUtils2: { getByText } = render(<FakeNavigator2 />);
    const goToAboutButton2 = testUtils2.getByText('Go to About');

    // WHEN
    expect(goToAboutButton1).toBeTruthy();
    expect(goToAboutButton2).toBeTruthy();

    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    fireEvent(goToAboutButton1, "press");
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    const navigationRef2StartRoute = navigationRef2.current.getCurrentRoute();

    fireEvent(goToAboutButton2, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(4);
    expect(DdRum.startView.mock.calls[2][0]).toBe(navigationRef2StartRoute.key);
    expect(DdRum.startView.mock.calls[2][1]).toBe(navigationRef2StartRoute.name);
    expect(DdRum.startView.mock.calls[2][3]).toStrictEqual({});
    expect(DdRum.startView.mock.calls[3][0]).toBe(navigationRef2.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[3][1]).toBe(navigationRef2.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[3][3]).toStrictEqual({});
})

it('M send a RUM ViewEvent for each W switching screens { multiple navigation containers }', async () => {

    // GIVEN
    render(<FakeNavigator1 />);
    render(<FakeNavigator2 />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
})

it('M register AppState listener only once', async () => {

    // GIVEN
    render(<FakeNavigator1 />);
    render(<FakeNavigator2 />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // THEN
    expect(AppState.addEventListener.mock.calls.length).toBe(1);
    expect(AppState.removeEventListener.mock.calls.length).toBe(0);
})

it('M stop active view W app goes into background', async () => {

    // GIVEN
    render(<FakeNavigator1 />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    capturedAppStateChangeCallback('background');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(1);
    expect(DdRum.stopView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.stopView.mock.calls[0][2]).toStrictEqual({});

})

it('M start last view W app goes into foreground', async () => {

    // GIVEN
    render(<FakeNavigator1 />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    capturedAppStateChangeCallback('background');
    capturedAppStateChangeCallback('active');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
})

it('M not stop view W no navigator attached', async () => {

    // GIVEN
    render(<FakeNavigator1 />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);

    // WHEN
    capturedAppStateChangeCallback('background');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(0);
})

it('M send a RUM ViewEvent for each W switching screens { nested navigation containers }', async () => {

    // GIVEN
    const testUtils: { getByText } = render(<FakeNestedNavigator />);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef3.current);
    const goToAboutButton = testUtils.getByText('Go to About');
    let initialRoute = navigationRef3.current?.getCurrentRoute()

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[0][0]).toBe(initialRoute?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(initialRoute?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef3.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef3.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})


// Internals

function FakeAboutScreen({ navigation }) {

    return (
        <View>
            <Text>Welcome to About</Text>
        </View>

    )
}

function FakeHomeScreen({ navigation }) {

    return (
        <View>
            <Text>Welcome to Home</Text>
            <Button title="Go to About" onPress={() => {
                navigation.navigate("About");
            }}></Button>
        </View>

    )
}

function FakeSettingsScreen({ navigation }) {

    return (
        <View>
            <Text>Welcome to About</Text>
        </View>

    )
}

function FakeProfileScreen({navigation}) {
    return (
        <Navigator>
            <Screen name="Home" component={FakeHomeScreen} />
            <Screen name="About" component={FakeAboutScreen} />
        </Navigator>
    )
}

function FakeNavigator1() {
    return (
        <NavigationContainer ref={navigationRef1}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    )
}

function FakeNavigator2() {
    return (
        <NavigationContainer ref={navigationRef2}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    )
}

function FakeNestedNavigator() {
    return (
        <NavigationContainer ref={navigationRef3}>
            <Navigator>
                <Screen name="Profile" component= {FakeProfileScreen} />
                <Screen name ="Settings" component= {FakeSettingsScreen}/>
            </Navigator>
        </NavigationContainer>
    )
}
