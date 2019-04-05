const rpn = require('request-promise-native')
const tv = require('./typeValidate')


class TrelloRequest {
  /** @param {{key:string,token:string}} keyTokenPair  */
  constructor(keyTokenPair) {
    tv.validate({obj: keyTokenPair, reqKeys: ['key', 'token']})
    this.key = keyTokenPair.key
    this.token = keyTokenPair.token
    this.uri = 'https://api.trello.com'

    // set doFullResponse to true if you want the full request
    // The caller will need to specify the result.resultCode or result.body
    // or any other property needed on the returned object
    this.doFullResponse = false
  }
  /** @returns the Trello api error when the rate is exceeded */
  static getRateLimitError() {return 429}
  /** @returns the suggested delay in MS based on 2X the API docs
   * http://help.trello.com/article/838-api-rate-limits
  */
  static getRateLimitDelayMs() {return 200}

  /**
   * Get the key/token pair - internal helper function
   * @private 
   */
  _getAuthObj() {
    return {key: this.key, token: this.token}
  }

  /**
   * Send a get command
   * @param {{path:string,options:object}} getOptions 
   * @returns {rpn.RequestPromise<object>} the promise resolves to a json object 
   * @example get(path:'/1/lists/123',options:{limit:10})
   */
  get(getOptions) {
    tv.validatePathOptions(getOptions)
    const {path, options} = getOptions
    const auth = this._getAuthObj()
    const fullQs = {...auth, ...options} // combine options with auth for query string
    const rpnOptions = {
      uri: `${this.uri}${path}`,
      qs: fullQs,
      json: true,
      resolveWithFullResponse: this.doFullResponse,
    }
    return rpn.get(rpnOptions)
  }

  /**
   * Send a put command
   * @param {{path:string, body:object}} putOptions 
   * @returns {rpn.RequestPromise<object>} the promise resolves to a json object 
   * @example put({path:' '/1/cards'/123}, body:{dueComplete:true}})
   */
  put(putOptions) {
    tv.validate({obj: putOptions, reqKeys: ['path', 'body']})
    const {path, body} = putOptions
    const rpnOptions = {
      uri: `${this.uri}${path}`,
      body,
      qs: this._getAuthObj(),
      json: true,
      resolveWithFullResponse: this.doFullResponse,
    }
    return rpn.put(rpnOptions)
  }


  /**
   * Send a post command
   * @param {{path:string, body:object}} postOptions 
   * @returns {rpn.RequestPromise<object>} the promise resolves to a json object 
   * @example post({path:'1/cards',body:{name:'card name'}})
   */
  post(postOptions) {
    tv.validate({obj: postOptions, reqKeys: ['path', 'body']})
    const {path, body} = postOptions
    const rpnOptions = {
      uri: `${this.uri}${path}`,
      body,
      qs: this._getAuthObj(),
      json: true,
      resolveWithFullResponse: this.doFullResponse,
    }
    return rpn.post(rpnOptions)
  }


  /**
   * Send a delete command
   * @param {{path:string, options:object}} deleteOptions 
   * @returns {rpn.RequestPromise<object>} the promise resolves to a json object 
   * @example delete(path:'/1/cards/<id>' ,options:{})
   */
  delete(deleteOptions) {
    tv.validatePathOptions(deleteOptions)
    const {path, options} = deleteOptions
    const rpnOptions = {
      uri: `${this.uri}${path}`,
      options,
      qs: this._getAuthObj(),
      resolveWithFullResponse: this.doFullResponse,
      json: true,
    }
    return rpn.delete(rpnOptions)
  }

}

module.exports = TrelloRequest