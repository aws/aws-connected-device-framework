/*-------------------------------------------------------------------------------
# Copyright (c) Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import config from 'config';
import ow from 'ow';
import { EventEmitter } from 'events';
import awsIot = require('aws-iot-device-sdk');
import { inject, injectable } from 'inversify';

import {logger} from '../utils/logger';
import { DeviceShadow, DeviceDelta } from './shadow.model';
import { DEVICE_SIMULATOR_TYPES } from '../di/types';

/**
 * Handles the connection with AWS IoT.
  * @type {S} the type used to represent the _desired_ portion of a device shadow.
  * @type {T} the type used to represent the _reported_ portion of a device shadow.
  * @type {U} the type used to represent the _delta_ portion of a device shadow.
 */
@injectable()
export class AwsIotThing<S,T,U> {

  private CLASS_LOGGING_DATA = {class: 'AwsIotThing'};

  private readonly _thingName: string;
  private _online: boolean = false;

  /**
   * The device shadow.
   */
  public shadow: DeviceShadow<S,T,U>;

  /**
   * @constructor
   * @param emitter 
   * @param mqttClient 
   */
  constructor(
    @inject(DEVICE_SIMULATOR_TYPES.AwsIotEmitter) private readonly emitter: EventEmitter,
    @inject(DEVICE_SIMULATOR_TYPES.AwsIotMqttClient) private readonly mqttClient: awsIot.thingShadow) {

    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'constructor'};
    logger.verbose('', {...logMeta, type: 'in'} );

    this._thingName = <string>config.get('aws.iot.thingName');
    logger.debug(`thingName: ${this._thingName}`, {...logMeta, type: 'value'} );
    ow(this._thingName, ow.string.nonEmpty);

    // wire up the main topics
    this.mqttClient.on('connect', this.onConnectHandler.bind(this));
    this.mqttClient.on('status', this.onStatusHandler.bind(this));
    this.mqttClient.on('delta', this.onDeltaHandler.bind(this));

    // wire up the remaining topics
    this.mqttClient.on('timeout', (_thingName, clientToken)=> {
      logger.verbose(`clientToken:${clientToken}`, {...this.CLASS_LOGGING_DATA,  method: 'timeout', type: 'in'} );
    });
    this.mqttClient.on('close', ()=> {
      logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'close', type: 'in'} );
    });
    this.mqttClient.on('offline', ()=> {
      logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'offline', type: 'in'} );
    });
    this.mqttClient.on('reconnect', ()=> {
      logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'reconnect', type: 'in'} );
    });
    this.mqttClient.on('error', (error:any)=> {
      logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'error', type: 'in'} );
      this.emitter.emit('error', error);
    });
  }

  private onConnectHandler (): void {
    logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'onConnectHandler', type: 'in'} );

    this.mqttClient.register( this._thingName, {}, ()=> {
      logger.verbose(``, {...this.CLASS_LOGGING_DATA,  method: 'register', type: 'in'} );
      this.mqttClient.get(this._thingName);
    });
  }

  private onStatusHandler (_thingName:string, status:string, clientToken:string, shadow:DeviceShadow<S,T,U>): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onStatusHandler'};
    logger.verbose(`stat:${status}, clientToken:${clientToken}, shadow:${JSON.stringify(shadow)}`, {...logMeta, type: 'in'} );

    if (shadow?.state!==undefined) {
      this.shadow = shadow;
    } else {
      logger.warn(`ignoring as no stateObject`, logMeta);
    }

    if (!this._online) {
      // we're now online
      this._online = true;
      this.emitter.emit('ready', shadow);
    }

    this.emitter.emit(clientToken, shadow);

  }

  private onDeltaHandler (thingName:string, delta:DeviceDelta<U>): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onDeltaHandler'};
    logger.silly(`thingName:${thingName}, delta:${JSON.stringify(delta)}`, {...logMeta, type: 'in'} );

    this.shadow.state.delta = delta.state;

    this.emitter.emit('delta', delta.state);
  }

  /**
   * Requests the latest version of the device shadow from AWS IoT. Subscribe to the _onChange_ callback to receive the response.
   * @param clientToken A unique identifier for the request which is to be provided to the _onChange_ callback to correlate the response.
   */
  public getShadow (clientToken:string): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'getShadow'};
    logger.silly(`clientToken:${clientToken}`, {...logMeta, type: 'in'} );
    this.mqttClient.get(this._thingName, clientToken);
  }

  /**
   * Updates the device shadow with AWS IoT.
   * @param clientToken 
   * @param reported 
   * @param desired 
   */
  public updateShadow (clientToken:string, reported:unknown, desired?: any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'updateShadow'};
    logger.silly(`clientToken:${clientToken}, reported:${JSON.stringify(reported)}`, {...logMeta, type: 'in'} );

    this.mqttClient.update(this._thingName, {
      state: {
        reported,
        desired
      },
      clientToken
    });
  }

  public publish (topic: string, message: any): Promise<void> {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'publish'};
    logger.silly(`topic:${topic}, message:${JSON.stringify(message)}`, {...logMeta, type: 'in'} );

    return new Promise((resolve, reject) => {
      if (!this._online) {
        logger.error('Not online', logMeta);
        return reject(new Error('NOT_ONLINE'));
      }
      this.mqttClient.publish(topic, JSON.stringify(message), {qos: 1}, () => {
        resolve();
      });
    });
  }

  public onReady (callback: (state: any) => void, other:any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onReady'};
    logger.silly(``, {...logMeta, type: 'in'} );

    this.emitter.on('ready', callback.bind(other));
  }

  public removeOnReady (callback: (state: any) => void): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'removeOnReady'};
    logger.silly(``, {...logMeta, type: 'in'} );

    this.emitter.removeListener('ready', callback);
  }

  // public onError (callback: (error: Error) => void): void {
  //   this._emitter.on('error', callback);
  // }

  public onChange (clientToken: string, callback: (state: any) => void, other:any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onChange'};
    logger.silly(`clientToken: ${clientToken}`, {...logMeta, type: 'in'} );

    this.emitter.on(clientToken, callback.bind(other));
  }

  public removeOnChange (clientToken:string, callback: (state: any) => void, other: any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'removeOnChange'};
    logger.silly(``, {...logMeta, type: 'in'} );

    this.emitter.removeListener(clientToken, callback.bind(other));
  }

  public onDelta (callback: (state: any) => void, other:any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onDelta'};
    logger.silly(``, {...logMeta, type: 'in'} );

    this.emitter.on('delta', callback.bind(other));
  }

  public removeOnDelta (callback: (state: any) => void, other: any): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'removeOnDelta'};
    logger.silly(``, {...logMeta, type: 'in'} );

    // ToDo: removeListener doesn't work just as one intended, so remove delta 
    this.emitter.removeListener('delta', callback.bind(other));
  }

  public onMessage (topic: string, callback: (message: any) => void): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'onMessage'};
    logger.silly(``, {...logMeta, type: 'in'} );

    this.mqttClient.subscribe(topic, {qos: 0}, (err: any) => {

      const logMeta2 = {...this.CLASS_LOGGING_DATA,  method: 'subscribe'};
      logger.silly(`topic: ${topic}`, {...logMeta2, type: 'in'} );
      if (err) {
        logger.error(`${err}`, logMeta2);
        throw err;
      } else {

        logger.debug(`connected`, logMeta2);
        this.mqttClient.on('message', (messageTopic: string, message: string) => {
          const logMeta3 = {...this.CLASS_LOGGING_DATA,  method: 'message'};
          logger.silly(`messageTopic: ${messageTopic}, message: ${message}`, {...logMeta3, type: 'in'} );
          if (messageTopic === topic) {
            let parsed = {};
            try {
              parsed = JSON.parse(message);
            } catch (e) {
              if (typeof callback === 'function') {
                logger.error(`${e}`, logMeta3);
                callback(message);
              }
            }
            if (typeof callback === 'function') {
              callback(parsed);
            }
          }
        });
      }
    });
  }

  public connectClose(): void {
    const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'connectClose'};
    logger.silly(``, {...logMeta, type: 'in'});

    // close
    this.mqttClient.end(false, () => {
      this._online = false;
      logger.silly(`online: ${this._online}`, {...logMeta, type: 'value'});
      // remove all listners
      this.mqttClient.removeAllListeners();
    });
  }
}
