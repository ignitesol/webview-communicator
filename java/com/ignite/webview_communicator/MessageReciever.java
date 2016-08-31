package com.enfold_android_sdk.webcommunicator;

import org.json.JSONArray;

/**
 * @version 0.1
 *
 *  MessageReciever defines the interface that Java objects
 *  need to implement in order to receive  from Javascript
 *  in WebView via WebViewCommunicator
 */
public interface MessageReciever {
    /**
     * The registered objects will receive the the name of
     * method called and arguments passed via this method.
     * The objects can then handle them appropriately.
     *
     * @param method     the name of the method called from javascript
     * @param callBackId Callback id
     * @param arg        a JSONArray containing the arguments passed
     */
    public void receiveCallFromJS(String method, int callBackId, JSONArray arg);
}
