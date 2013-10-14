//
//  WebViewCommunicator.h
//  HelloWorld
//
//  Created by Iqbal Ansari on 10/10/13.
//  Copyright (c) 2013 Iqbal Ansari. All rights reserved.
//

#import <Foundation/Foundation.h>

// URLs having this prefix will be intercepted by WebViewCommunicator
#define WVCOMMUNICATOR_PREFIX @"js:WebViewCommunicator/"

// Objects that wish to recieve messages from javascript need to conform to this protocol
@protocol WVCommunicator <NSObject>

// The objects will recieve the method name, and an array of arguments passed via this method
@required
- (void) receiveCallFromJS:(NSString*)method withArguments:(NSArray*) arguments;

@end

@interface WebViewCommunicator : NSObject <UIWebViewDelegate>

@property UIWebView* target;
@property (strong) NSMutableDictionary* registeredObjects;

// Initialize WebViewCommunicator with this method, it accepts the webview with which you wish to communicate
- (id) initWithWebView:(UIWebView *)webview;

// Public method to call javascript object, it accepts the object name, the method to be called and the arguments
// to be passed
- (void) callJS:(NSString *)object onMethod:(NSString *)method withArguments:(NSMutableArray *)arguments;

// Register an object for listening messages from Javascript, it accepts the tag that will be used to identify the object
// the object needs to conform to the WVCommunicator protocol
- (BOOL) registerObject:(id <WVCommunicator>) object withTag:(NSString*) tag;

@end