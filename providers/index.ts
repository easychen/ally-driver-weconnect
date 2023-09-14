import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class WeConnectProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally')
    const { WeConnect } = await import('../src/WeConnect')

    Ally.extend('weconnect', (_, __, config, ctx) => {
      return new WeConnect(ctx, config)
    })
  }
}
