package com.enfold_android_sdk.webcommunicator;

import android.os.Handler;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONException;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.HashMap;

/**
 * @version 0.1
 *
 * Class for communicating with WebView
 */
public class WebViewCommunicator {

    /**
     * registeredObjects stores the mapping between the registered object and
     * the tags used to recognize them
     */
    private HashMap<String, MessageReciever> registeredObjects;

    /**
     * webViewInstance is a reference to the webview in which the Javascript
     * objects we need to communicate with reside
     */
    private WebView webViewInstance;

    /**
     * Handler is used to execute Javascript code in webview instance
     */
    private Handler uiHandler;

    /**
     * The global Javascript object, which is used for communication between
     * the webview and the Java object.
     */
    private final static String JSOBJECT = "WebViewCommunicator";

    /**
     * In order to use WebViewCommunicator, an activity needs to initialize it
     * using an instance of the WebView and a Handler
     *
     * @param webView   the webView instance with which the activity needs to
     *                  communicate make sure that you have executed the javascript
     *                  side of WebViewCommunicator in the webview
     * @param uiHandler a Handler bound to the thread on which the webView is running
     *                  This is needed to execute Javascript on WebView's thread
     * @see <a href="http://developer.android.com/reference/android/os/Handler.html">Handler</a>
     */
    public WebViewCommunicator(WebView webView, Handler uiHandler) {
        this.webViewInstance = webView;
        this.uiHandler = uiHandler;
        this.registeredObjects = new HashMap<String, MessageReciever>();
        webView.addJavascriptInterface(this, "_WebViewCommunicator");
    }

    /**
     * Helper method to get the Javascript code to be executed in the webview
     *
     * @param tag    tag of the object on which the method is to be invoked
     * @param method the method to invoke on object
     * @param args   the arguments to be based when invoking the method
     * @return the javascript code that will need to be executed in the
     * webview in the form of a string
     */
    private String getJSCode(String tag, String method, String args) {
        return (JSOBJECT + ".raiseEvent('" + tag + "', '" + method + "', '" + args + "')");
    }

    /**
     * Invokes method on the javascript object.
     *
     * @param tag    the tag of the javascript object on which the method needs to be invoked
     * @param method the method to be invoked
     * @param args   the parameters with which the method is to be invoked
     */
    private void raiseJSEvent(String tag, String method, String args) {
        final String code = getJSCode(tag, method, args);
        uiHandler.post(new Runnable() {
            @Override
            public void run() {
                webViewInstance.loadUrl("javascript:" + code);
            }
        });
    }

    /**
     * This method can be used by the app to invoke methods on the javascript object
     * the arguments should be in the form of a JSONArray. It accepts the following
     * parameters
     *
     * @param tag    the tag of the javascript object which we wish to invoke
     * @param method the method to invoke
     * @param args   the arguments to be passed to the method
     */
    public void callJS(String tag, String method, JSONArray args) {
        try {
            String arguments = URLEncoder.encode(args.toString(), "UTF-8");
            tag = URLEncoder.encode(tag, "UTF-8");
            method = URLEncoder.encode(method, "UTF-8");
            raiseJSEvent(tag, method, arguments);

        } catch (UnsupportedEncodingException e) {
            Log.w("URL encoding failed: ", "Check encoding");
            e.printStackTrace();
        }
    }

    /**
     * Convenient method for invoking javascript object methods without arguments
     * Same as calling {@link #callJS(String, String, JSONArray) callJS} with an
     * empty JSONArray
     *
     * @param tag    the tag of the javascript object which we wish to invoke
     * @param method the method to invoke
     */
    public void callJS(String tag, String method) {
        try {
            tag = URLEncoder.encode(tag, "UTF-8");
            method = URLEncoder.encode(method, "UTF-8");
            raiseJSEvent(tag, method, null);

        } catch (UnsupportedEncodingException e) {
            Log.w("URL encoding failed: ", "Check encoding");
            e.printStackTrace();
        }
    }

    /**
     * Allows the activity to register objects for receiving messages
     * from Javascript.
     * <p/>
     * The receiving object should implement the MessageReciever interface.
     *
     * @param tag    the tag with which the receiving object will be invoked
     * @param client an object implementing the communicator interface
     * @return true if the object was successfully registered else false
     * is the tag is already being used
     * @see MessageReciever
     */
    public boolean registerObject(String tag, MessageReciever client) {
        if (registeredObjects.containsKey(tag)) {
            Log.e("Duplicate tag", "An object is already registered with the given tag");
            return false;
        } else {
            registeredObjects.put(tag, client);
            return true;
        }
    }

    /**
     * Method exposed to the javascript for invoking native java methods
     * It accepts the following parameters
     *
     * @param tag        the tag of the object on which to invoke the method
     * @param method     the method to invoke
     * @param callbackId Callback Id
     * @param args       the arguments to be passed to the method
     * @return returns false if the object is not found else it returns true
     */
    @JavascriptInterface
    public boolean nativeCall(String tag, String method, final int callbackId, String args) {

        // Check if the an object is registered with given tag, if we have such object
        // invoke its 'router' method else simply log an error message and raise return
        // false
        if (registeredObjects.containsKey(tag)) {
            final String TAG = tag, METHOD = method, ARGS = args;

            Thread mThread = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        registeredObjects.get(TAG).receiveCallFromJS(METHOD, callbackId, new JSONArray(ARGS));
                    } catch (JSONException e) {
                        Log.w("nativeCall", "JSON Parsing failed");
                        e.printStackTrace();
                    }
                }
            });

            uiHandler.post(mThread);
            return true;
        } else {
            String errorMsg = "Error: No object with tag '" + tag + "' registered on application";
            callJS("__self", "log", new JSONArray().put(errorMsg));
            return false;
        }
    }
}
