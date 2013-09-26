# What is Communicator?

Android provides some simple mechanisms for interaction between a webview and
the activity embedding it namely `addJavascriptInterface` and `loadUrl`.
Communicator is a simple wrapper around these functions which allows the
activity and the webview to communicate without having to worry about the
underlying mechanism.

With Communicator you can simply `register` your objects and call its methods
with desired arguments. Right now the library supports only asynchronous calls.

# How to use it?

For using communicator you will need to set it up in your `WebView` as well as
in the android `Activity` as described below.

##1. Setup

+ ###In WebView

    You will need to include the webcommunicator.js in desired webview.

```
<script type="text/javascript" src="/path/to/communicator.js"></script>
```

+ ###In activity

    You will need to create an instance of WebViewCommunicator, it accepts two parameters

1. An instance of `WebView` with which you want to use the communicator
2. An instance `Handler`

```
WebView myWebView = new WebView(this);
Handler myHandler = new Handler();
WebViewCommunicator myCommunicator = new WebViewCommunicator(myWebView, myHandler);
```

##2. Usage

### Java -> Javascript

Once setup you can now register the Javascript objects that you want to call from     the activity as follows (In Javascript)

```javascript
WebViewCommunicator.register("myObject", {
   mymethod : function(a, b, c){
         //...
   }
});
```

The first argument to `register` is the `tag` that will can be used for communicating
with this object by the activity ("__self" is reserved for internal use), the second
argument is your object.

Now from you activity you can call this object as follows (arguments are packed in JSONArray)

```java
JSONArray args = new JSONArray();
args.put("first_args");
args.put("second_args");
myCommunicator.callJS("myObject", "mymethod", args);
```

where `myCommunicator` is the instance of `WebCommunicator`. 

### Javascript -> Java
        
A Java object that wants to expose itself to Javascript needs to implement 'Communicator'
interface. The interface defines `router` method. Whenever a Java object is called from
Javascript, the `router` method of the object recieves two arguments, the method is
called name of the method called and the arguments passed to the method as a `JSONArray`.

The `router` can then call the desired methods. eg

```java
myCommunicator.register("UIManager", new Communicator() {
    @Override
    public void router(String method, JSONArray arg) {
        if(method.equals("exit") {
            confirmExit(arg);
        }
    }
});
```

Once a Java object is registered you can call it from Javascript as follows

```javascript
WebViewCommunicator.nativeCall("UIManager", "exit");
```

##3. Example usage

Lets control the actions taken when hardware buttons are pressed using javascript.

First we will need to register our Javascript object that will take appropriate
actions when buttons are pressed. We add this to our Javascript code (after setting up
WebViewCommunicator in the webview) 

```javascript
WebViewCommunicator.register("UIManager", {
								keypress : function(keycode, immediate) {
									if(keycode === BACK_BUTTON && immediate) {
										// Do some random stuff
										// Call native Java object to exit the application
										WebViewCommunicator.nativeCall("UIManager", "exitApp", 0, "Normal exit");
									}
								});
```

In the activity first create an instance of WebViewCommunicator. We also register an object 
to accept messages from Javascript (not needed if we don't invoke any java object from JS).

```java
Handler handler = new Handler();
WebViewCommunicator webInterface = new WebViewCommunicator(myWebView, handler);
webInterface.register("UIManager", new Communicator() {
	@Override
	public void router(String method, JSONArray args) {
			if(method === "exitApp") {
				try {
					int exitCode = args.getInt(0);
					String exitMessage = args.getString(1);
					exitApp(exitCode, exitMessage);
				} catch (JSONException e) {
					e.printStackTrace();
				}
			}
		}
});
```

We can now notify our javascript object as follows

```java
@Override
public boolean onKeyDown(int keyCode, KeyEvent event) {
JSONArray args = new JSONArray();
	args.put(keyCode);
	args.put(true);
	webInterface.callJS("UIManager", "keypress", args);
}
```
