// @ts-check
/** @module trello */
const TrelloRequest = require('./trelloRequest')
const envCreate = require('env-create')
const logger = require('./util/logger')
const moment = require('moment')
const tv = require('./typeValidate')


class Trello {
  /**
   * Create the TrelloPLus class to add more trello functions
   * @param {string=} pathString path to the trello JSON credentials file
   */
  constructor(pathString) {
    const param = {}
    if (pathString !== undefined) {
      param.path = pathString
    }
    const result = envCreate.load(param)
    if (result.status === false) {
      const errorMsg = `FATAL ERROR reading credentials. ${JSON.stringify(result, null, 2)}`
      logger.error(errorMsg)
      throw (errorMsg)
    }
    const trelloAuth = JSON.parse(process.env.trelloHelper)
    const {appKey: key, token} = trelloAuth
    this.trelloRequest = new TrelloRequest({key, token})
  }

  // --------------------------------------------------------------------------
  // Some pass through functions to TrelloRequest
  /**
   * Turn on full responses for the http command responses. Intended for debugging
   * troubleshooting only at this point as it hasn't been tested.
   * @param {boolean} enable - set to true to enable full response (off by default) 
   */
  enableFullResponse(enable) {
    this.trelloRequest.doFullResponse = enable
  }

  isInFullResponseMode() {
    return this.trelloRequest.doFullResponse
  }

  getRateLimitError() {
    return TrelloRequest.getRateLimitError()
  }

  getRateLimitDelayMs() {
    return TrelloRequest.getRateLimitDelayMs()
  }

  // --------------------------------------------------------------------------


  /** @return '/1/cards'  */
  static getBaseCardCmd() {return '/1/cards'}
  /** @returns '/1/cards/<id>' */
  static getCardPrefixWithId(cardId) {return `${Trello.getBaseCardCmd()}/${cardId}`}
  /** @return '/1/cards/<id>/due */
  static getCardDueCmd(cardId) {return `${Trello.getCardPrefixWithId(cardId)}/due`}
  /** @returns '/1/lists/<listId>' */
  static getListPrefixWithId(listId) {return `/1/lists/${listId}`}
  /** @returns '/1/lists/<id>/cards */
  static getListCardCmd(listId) {return `${Trello.getListPrefixWithId(listId)}/cards`}
  /** @returns '/1/boards/<id>' */
  static getBoardPrefixWithId(boardId) {return `/1/board/${boardId}`}

  /** @param {tv.cardFieldType} cfp - the Card Field Parameter*/
  static getCustomFieldUpdateCmd(cfp) {
    tv.validate({obj: cfp, reqKeys: ['cardId', 'fieldId']})
    return `/1/cards/${cfp.cardId}/customField/${cfp.fieldId}/item`
  }

  /**
  * Wrap the underlying makeRequest for get
  * @param {tv.pathOptionsType} pathOptions technically an http path but to the Trello API its command
  * @return {Promise<any>}
  * @example get({path:this.getListCardCmd('123'),options: {limit:10}})
  */
  async get(pathOptions) {
    tv.validatePathOptions(pathOptions)
    const {path, options} = pathOptions
    const getOptions = {
      path,
      options,
    }
    const responseStr = await this.trelloRequest.get(getOptions)
    return responseStr
  }
  /** wrap the underlying makeRequest for put 
   * @param {tv.pathOptionsType} pathOptions  technically an http path but to the Trello API it's command 
   * @return {Promise<any>}
   * @example  put({path:getCardPrefixWithId(<cardId>), options:{dueComplete: true}})
   */
  async put(pathOptions) {
    tv.validatePathOptions(pathOptions)
    const {path, options} = pathOptions
    const putOptions = {
      path,
      body: options,
    }
    return await this.trelloRequest.put(putOptions)
  }

  /**
  * Wrap the underlying makeRequest for post
  * @param {tv.pathOptionsType} pathOptions technically an http path but to the Trello API it's command
  * @return {Promise<any>}
  * @example post({path:this.getBaseCardCmd(), options:{name:'card name', description:'some desc., idList:<idOfList>}})
  */
  async post(pathOptions) {
    tv.validatePathOptions(pathOptions)
    const {path, options} = pathOptions
    const postOptions = {
      path,
      body: options,
    }
    return await this.trelloRequest.post(postOptions)
  }

  /** wrap the underlying makeRequest for delete 
  * @param {tv.pathOptionsType} pathOptions 
  * @return {Promise<any>}
  * @example  delete(getCardPrefixWithId(<cardId>)})
  */
  async delete(pathOptions) {
    tv.validatePathOptions(pathOptions)
    const {path, options} = pathOptions
    const deleteOptions = {
      path,
      options,
    }
    return await this.trelloRequest.delete(deleteOptions)
  }

  /** Get the actions on the card. Filter by tye action type if desired
   * defaults to 'all' for all action types see
   * https://developers.trello.com/reference/#action-types
   * @param {{cardId:string, filter:string}} param
   * @returns {Promise<Array.<Object<string,any>>>}
   */
  getActionsOnCard(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'filter']})
    const path = `${Trello.getCardPrefixWithId(param.cardId)}/actions`
    let filterValue = param.filter
    if (filterValue === '') {
      filterValue = 'all'
    }
    const options = {
      filter: filterValue,
      // eslint-disable-next-line camelcase
      limit: 1000,
    }
    return this.get({path, options})
  }

  // ========================= Custom Field Setters/Getters =====================  
  /**
   * Get the array of custom field items on the card.
   * @param {string} cardId 
   * @returns {Promise<Array<object>>}
   */
  getCustomFieldItemsOnCard(cardId) {
    const path = `${Trello.getCardPrefixWithId(cardId)}/customFieldItems`
    return this.get({path, options: {}})
  }

  /**
   * Set the value of a custom Field object
   * @param {tv.customFieldType} customFieldObj 
   *  see Trello.customFieldType for valid types
   * @returns {{}} an empty object- oh well so much for testing
   */
  setCustomFieldValueOnCard(customFieldObj) {
    tv.validate({obj: customFieldObj, reqKeys: ['cardFieldObj', 'type', 'value']})
    tv.validate({obj: customFieldObj.cardFieldObj, reqKeys: ['cardId', 'fieldId']})

    const fieldType = Trello.customFieldType
    const path = Trello.getCustomFieldUpdateCmd(customFieldObj.cardFieldObj)
    const valueObj = {}
    const {type, value} = customFieldObj
    // a list takes a simple {idValue:'value'}
    if (type === fieldType.list) {
      valueObj.idValue = value
    } else { // the others take a {value: {'type':'value}} where type is something like text, number etc...
      valueObj.value = {}
      valueObj.value[type] = value
    }
    return this.put({path, options: valueObj})
  }

  // ==========================================================================


  /**
   * Get all archived cards from the board that match the passed list id
   * @param {{listId:string, options}} param  
   * @returns {Promise<Array<Object<string,any>>>} a Promise of an array of card objects
   * @example getCardsOnListWith({listId:'123',options:{customFieldItems:true}})
   */
  getCardsOnList(param) {
    tv.validate({obj: param, reqKeys: ['listId', 'options']})
    const path = `${Trello.getListCardCmd(param.listId)}`
    const {options} = param
    return this.get({path, options})
  }

  /**
   * Get all the cards on the board. Two useful options are
   * limit:x to limit the number of cards (1 to 1000) coming back and
   * fields:'name,desc'
   * @param {{boardId:string, options}} param 
   * @returns {Promise<Array<Object<string,any>>>} a Promise of an array of card objects
   */
  getCardsOnBoard(param) {
    tv.validate({obj: param, reqKeys: ['boardId', 'options']})
    const {boardId, options} = param
    const path = `${Trello.getBoardPrefixWithId(boardId)}/cards`
    return this.get({path, options})

  }


  /**
   * Get all cards that are archived for the specified list
   * @param {{boardId,listId}} param 
   * @returns {Promise<Array.<Object>>} returns Promise to array of cards
   * @example getArchivedCards({boardId:'123',listId'456'})
   */
  async getArchivedCards(param) {
    tv.validate({obj: param, reqKeys: ['boardId', 'listId']})
    const options = {filter: 'closed'}
    const list = param.listId
    const path = `${Trello.getBoardPrefixWithId(param.boardId)}/cards`
    const archivedCards = await this.get({path, options})
    if (archivedCards.length < 1) {return []}
    const archivedOnList = archivedCards.filter(e => e.idList === list)
    return archivedOnList
  }

  /**
   * Archives all the cards on the passed list id
   * @param {{listId:string}} param 
   * @returns {Promise<object>}
   * 
   */
  async archiveAllCardsOnList(param) {
    tv.validate({obj: param, reqKeys: ['listId']})
    const path = `${Trello.getListPrefixWithId(param.listId)}/archiveAllCards`
    return this.post({path, options: {}})
  }

  /**
   * Find actions that indicate card was previously on the specified list name
   * @param {tv.actionFilterListType} param 
   * @return {Array<Object>} the array of actions that fit the criteria
   * @example actionWasOnList({actions,filterList:'idOfList'})
   */
  actionWasOnList(param) {
    /** @type tv.validateType */
    const tvObj = {
      obj: param,
      reqKeys: ['actions', 'filterList'],
    }
    tv.validate(tvObj)
    for (const action of param.actions) {
      tvObj.obj = action
      tvObj.reqKeys = ['data']
      tv.validate(tvObj)
    }
    return param.actions.filter(e => e.data.listBefore === param.filterList)
  }
  /**
   * Find actions in array whose `type` field matches the passed type property
   * @param {tv.actionFilterType} param 
   * @returns {Array<Object<string,any>>} - array of matching actions
   * @usage filterActionsByType({actions:[], type:'updateCard'})
   */
  filterActionsByType(param) {
    tv.validate({obj: param, reqKeys: ['actions', 'filterType']})
    return param.actions.filter(e => e.type === param.filterType)
  }

  /**
   * Find any actions that are of type 'moveCardToBoard' and capture
   * the number found and the date of the first one found
   * @param {Array.<Object<string,any>>} actions the action objects 
   * @returns {Array.<Object<string,any>>} array of actions of the moveCardToBoardType 
   * will have count of number of actions found. Date has date of first object found
   * @example getMoveCardToBoardInfo([{actionObjects}])
   */
  getMoveCardToBoardActions(actions) {
    return this.filterActionsByType({actions, filterType: 'moveCardToBoard'})
  }

  /**
   * Set the due date on card as complete when isComplete:true or clear it if 
   * isComplete:false
   * @param {{cardId,isComplete:boolean}} param 
   * @returns {Promise<Object<string,any>>} a Promise of a card object
   * @example setDueComplete({id:'123', isComplete:true})
   */
  setDueComplete(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'isComplete']})
    const path = Trello.getCardPrefixWithId(param.cardId)
    const options = {dueComplete: param.isComplete}
    return this.put({path, options})
  }

  /**
   * Add the card to the specified list. Use name and optional description
   * @param {{idList:string, name:string, desc:string}} options 
   * @returns {Promise<Object<string,any>>} a Promise of a card object
   * @example addCard({name:'my name',description:'test',idList:'12345"})
   */
  addCard(options) {
    tv.validate({obj: options, reqKeys: ['idList', 'name', 'desc']})
    return this.post({path: Trello.getBaseCardCmd(), options})
  }

  /**
   * 
   * @param {string} id of the card 
   */
  deleteCard(id) {
    const path = Trello.getCardPrefixWithId(id)
    return this.delete({path, options: {}})
  }

  /**
   * Add a comment to the card
   * @param {{cardId:string,text:string}} param id of the card and text for the comment
   * @returns {Promise<Object<string,any>>} a Promise of a card object
   * @example addCommentOnCard({id:'123',text:"message for comment"})
   */
  addCommentOnCard(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'text']})
    const path = `${Trello.getCardPrefixWithId(param.cardId)}/actions/comments`
    const {text} = param
    return this.post({path, options: {text}})
  }

  /**
   * Add a member to a card using the member's id
   * @param {{cardId:string,memberId:string}} param 
   */
  addMemberToCard(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'memberId']})
    const {cardId, memberId} = param
    const path = `${Trello.getCardPrefixWithId(cardId)}/members`
    return this.post({path, options: {value: memberId}})
  }

  /**
   * 
   * @param {{cardId:string, memberId:string}} param 
   */
  removeMemberFromCard(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'memberId']})
    const {cardId, memberId} = param
    const path = `${Trello.getCardPrefixWithId(cardId)}/idMembers/${memberId}`
    return this.delete({path, options: {}})
  }

  /**
   * Get all the members on the passed board
   * @param {{boardId:string}} param 
   * @returns {Promise<Array<{id:string, fullName:string, username:string}>>}
   */
  getMembersOnBoard(param) {
    tv.validate({obj: param, reqKeys: ['boardId']})
    const {boardId} = param
    const path = `${Trello.getBoardPrefixWithId(boardId)}/members`
    return this.get({path, options: {}})
  }

  /**
   * Add due date to a card using a relative offset
   * the offset object has a count property (a number) and a units property 
   *  `days, months, years, quarters, hours, minutes`  
   * @param {{cardId:string,offset:{count:Number,units:string}}} param 
   * @returns {Promise<Object<string,any>>} a Promise of a card object - card will updated due date
   * @example await trello.addDueDateToCardByOffset({
        id: FAKE_ID,
        offset: {count: 7, units: 'days'},
      })
   */
  addDueDateToCardByOffset(param) {
    tv.validate({obj: param, reqKeys: ['cardId', 'offset']})
    tv.validate({obj: param.offset, reqKeys: ['count', 'units']})
    // @ts-ignore
    const dueDate = moment().add(param.offset.count, param.offset.units)
    const path = Trello.getCardDueCmd(param.cardId)
    return this.put({path, options: {value: dueDate.format()}})
  }
}

// A static helper enumeration so users don't have to hard code magic strings
Trello.customFieldType = {
  /** @type {string} */
  list: 'list', // this one gets special handling
  text: 'text',
  number: 'number', // still takes a string as a value
  date: 'date', // also takes a string
  checkbox: 'checked', // takes a string of 'true' or 'false'
}


module.exports = Trello