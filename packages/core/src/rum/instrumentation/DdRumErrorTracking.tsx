/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../foundation';


const EMPTY_STACK_TRACE = ""
const TYPE_SOURCE = "SOURCE"
const TYPE_CONSOLE = "CONSOLE"

/**
* Provides RUM auto-instrumentation feature to track errors as RUM events.
*/
export class DdRumErrorTracking {

    private static isTracking = false

    // eslint-disable-next-line 
    private static defaultErrorHandler = (_error: any, _isFatal?: boolean) => {}

    // eslint-disable-next-line 
    private static defaultConsoleError = (..._params: unknown[]) => {}

    /**
     * Starts tracking errors and sends a RUM Error event every time an error is detected.
     */
    static startTracking(): void {
        // extra safety to avoid wrapping the Error handler twice
        if (DdRumErrorTracking.isTracking) {
            console.log("DdRumErrorTracking already started");
            return
        }
        
        if (ErrorUtils) {
            DdRumErrorTracking.defaultErrorHandler = ErrorUtils.getGlobalHandler();
            DdRumErrorTracking.defaultConsoleError = console.error;

            
            ErrorUtils.setGlobalHandler(DdRumErrorTracking.onGlobalError);
            console.error = DdRumErrorTracking.onConsoleError;

            DdRumErrorTracking.isTracking = true;
        }

    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    static onGlobalError(error: any, isFatal?: boolean): void  {
        DdRum.addError(
            String(error), 
            TYPE_SOURCE, 
            DdRumErrorTracking.getErrorStackTrace(error), 
            Date.now(), 
            { "_dd.error.is_crash": isFatal, "_dd.error.raw": error }
        ).then(() => {
            DdRumErrorTracking.defaultErrorHandler(error, isFatal);
        });
    }

    static onConsoleError(...params: unknown[]): void  {
        let stack: string = EMPTY_STACK_TRACE
        for (let i = 0; i < params.length; i += 1) {
            const param = params[i];
            const paramStack = DdRumErrorTracking.getErrorStackTrace(param)
            if (paramStack != undefined && paramStack != EMPTY_STACK_TRACE){
                stack = paramStack;
                break;
            }
        }

        const message = params.map((param) => {
            if (typeof param === 'string') { return param }
            else if (param instanceof Error) { return String(param) }
            else { return JSON.stringify(param)}
        }).join(' ');

        
        DdRum.addError(
            message, 
            TYPE_CONSOLE,
            stack, 
            Date.now(), 
            {}
        ).then(() => {
            DdRumErrorTracking.defaultConsoleError.apply(console, params);
        });
        
    }

    private static getErrorStackTrace(error: any | undefined): string {
        let stack = EMPTY_STACK_TRACE
        if (error == undefined) {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'string') {
            stack = EMPTY_STACK_TRACE;
        } else if ('componentStack' in error) {
            stack = String(error.componentStack);
        } else if (('sourceURL' in error) && ('line' in error) && ('column' in error)) {
            stack = `at ${error.sourceURL}:${error.line}:${error.column}`;
        }
        return stack
    }
}

