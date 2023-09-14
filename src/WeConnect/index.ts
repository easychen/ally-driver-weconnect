/*
|--------------------------------------------------------------------------
| Ally Oauth driver
|--------------------------------------------------------------------------
|
| This is a dummy implementation of the Oauth driver. Make sure you
|
| - Got through every line of code
| - Read every comment
|
*/

import type { AllyUserContract, ApiRequestContract } from '@ioc:Adonis/Addons/Ally'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Oauth2Driver, ApiRequest } from '@adonisjs/ally/build/standalone'

/**
 * Define the access token object properties in this type. It
 * must have "token" and "type" and you are free to add
 * more properties.
 *
 * ------------------------------------------------
 * Change "WeConnect" to something more relevant
 * ------------------------------------------------
 */
export type WeConnectAccessToken = {
  token: string
  type: 'bearer'
}

export type WeConnectAccessResult = {
  access_token: string
  expires_in: number
  refresh_token: string
  openid: string
  scope: string
  unionid: string
  is_snapshotuser: number
}

/**
 * Define a union of scopes your driver accepts. Here's an example of same
 * https://github.com/adonisjs/ally/blob/develop/adonis-typings/ally.ts#L236-L268
 *
 * ------------------------------------------------
 * Change "WeConnect" to something more relevant
 * ------------------------------------------------
 */
export type WeConnectScopes = 'snsapi_userinfo'

/**
 * Define the configuration options accepted by your driver. It must have the following
 * properties and you are free add more.
 *
 * ------------------------------------------------
 * Change "WeConnect" to something more relevant
 * ------------------------------------------------
 */
export type WeConnectConfig = {
  driver: 'weconnect'
  clientId: string
  clientSecret: string
  callbackUrl: string
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
}

/**
 * Driver implementation. It is mostly configuration driven except the user calls
 *
 * ------------------------------------------------
 * Change "WeConnect" to something more relevant
 * ------------------------------------------------
 */
export class WeConnect extends Oauth2Driver<WeConnectAccessToken, WeConnectScopes> {
  /**
   * The URL for the redirect request. The user will be redirected on this page
   * to authorize the request.
   *
   * Do not define query strings in this URL.
   */
  protected authorizeUrl = 'http://dd.ftqq.com/app/1'

  /**
   * The URL to hit to exchange the authorization code for the access token
   *
   * Do not define query strings in this URL.
   */
  protected accessTokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token'

  /**
   * The URL to hit to get the user details
   *
   * Do not define query strings in this URL.
   */
  protected userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo'

  /**
   * The param name for the authorization code. Read the documentation of your oauth
   * provider and update the param name to match the query string field name in
   * which the oauth provider sends the authorization_code post redirect.
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error. Read the documentation of your oauth provider and update
   * the param name to match the query string field name in which the oauth provider sends
   * the error post redirect
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the CSRF token. Make sure it is always unique. So a better
   * approach is to prefix the oauth provider name to `oauth_state` value. For example:
   * For example: "facebook_oauth_state"
   */
  protected stateCookieName = 'WeConnect_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state from.
   * Read the documentation of your oauth provider and update the param
   * name to match the query string used by the provider for exchanging
   * the state.
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for sending the scopes to the oauth provider.
   */
  protected scopeParamName = 'scope'

  /**
   * The separator indentifier for defining multiple scopes
   */
  protected scopesSeparator = ' '

  protected openid = ''

  constructor(ctx: HttpContextContract, public config: WeConnectConfig) {
    super(ctx, config)

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request.
     *
     * DO NOT REMOVE THE FOLLOWING LINE
     */
    this.loadState()
  }

  /**
   * Update the implementation to tell if the error received during redirect
   * means "ACCESS DENIED".
   */
  public accessDenied() {
    return this.ctx.request.input('error') === 'user_denied'
  }

  public async getAccessToken(
    callback?: ((request: ApiRequestContract) => void) | undefined
  ): Promise<WeConnectAccessToken> {
    const urlBase = this.config.accessTokenUrl || this.accessTokenUrl
    const request = this.httpClient(urlBase)
    request.param('appid', this.config.clientId)
    request.param('secret', this.config.clientSecret)
    request.param('grant_type', 'authorization_code')
    request.param('code', this.ctx.request.input('code'))
    request.param('grant_type', 'authorization_code')

    if (typeof callback === 'function') {
      callback(request)
    }
    const result = JSON.parse(await request.get())
    this.openid = result.openid
    return {
      token: result.access_token,
      type: 'bearer',
    }
  }

  /**
   * Get the user details by query the provider API. This method must return
   * the access token and the user details both. Checkout the google
   * implementation for same.
   *
   * https://github.com/adonisjs/ally/blob/develop/src/Drivers/Google/index.ts#L191-L199
   */
  public async user(
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<WeConnectAccessToken>> {
    const accessToken = await this.accessToken()
    const urlBase = this.config.userInfoUrl || this.userInfoUrl
    const request = this.httpClient(urlBase)
    request.param('access_token', accessToken.token)
    request.param('openid', this.openid)
    request.param('lang', 'zh_CN')

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if required)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    /**
     * Write your implementation details here
     */
    const user = JSON.parse(await request.get())

    return {
      ...user,
      token: { token: accessToken.token, type: 'bearer' as const },
    }
  }

  // 这个方法有问题，openid在getAccessToken方法中设置到this.openid中，但是在这个方法是另一次独立请求，所以this.openid为空
  public async userFromToken(
    accessToken: string,
    callback?: (request: ApiRequest) => void
  ): Promise<AllyUserContract<{ token: string; type: 'bearer' }>> {
    const urlBase = this.config.userInfoUrl || this.userInfoUrl
    const request = this.httpClient(urlBase)
    request.param('access_token', accessToken)
    request.param('openid', this.openid)
    request.param('lang', 'zh_CN')

    /**
     * Allow end user to configure the request. This should be called after your custom
     * configuration, so that the user can override them (if required)
     */
    if (typeof callback === 'function') {
      callback(request)
    }

    /**
     * Write your implementation details here
     */
    const user = JSON.parse(await request.get())
    return {
      ...user,
      token: { token: accessToken, type: 'bearer' as const },
    }
  }
}
