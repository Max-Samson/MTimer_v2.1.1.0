export namespace main {

  export class App {
    static readonly RuntimeId: string = '3ac5d7e1-f12a-4bfd-b3e1-5cd49941e69e'
  }

}

export interface DeepSeekAPIRequest {
  model: string
  messages: DeepSeekMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

export interface DeepSeekMessage {
  role: string
  content: string
}

export interface DeepSeekAPIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: DeepSeekChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface DeepSeekChoice {
  index: number
  message: DeepSeekMessage
}

export namespace types {

  export class DeepSeekMessage {
    role: string
    content: string

    static createFrom(source: any = {}) {
      return new DeepSeekMessage(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.role = source.role
      this.content = source.content
    }
  }

  export class DeepSeekAPIRequest {
    model: string
    messages: DeepSeekMessage[]
    stream: boolean
    api_key?: string
    base_url?: string

    static createFrom(source: any = {}) {
      return new DeepSeekAPIRequest(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.model = source.model
      this.messages = this.convertValues(source.messages, DeepSeekMessage)
      this.stream = source.stream
      this.api_key = source.api_key
      this.base_url = source.base_url
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a
      }
      if (a.slice && a.map) {
        return (a as any[]).map(elem => this.convertValues(elem, classs))
      }
      else if (typeof a === 'object') {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key])
          }
          return a
        }
        return new classs(a)
      }
      return a
    }
  }

  export class DeepSeekChoice {
    index: number
    message: DeepSeekMessage
    delta?: DeepSeekMessage

    static createFrom(source: any = {}) {
      return new DeepSeekChoice(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.index = source.index
      this.message = this.convertValues(source.message, DeepSeekMessage)
      this.delta = this.convertValues(source.delta, DeepSeekMessage)
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a
      }
      if (a.slice && a.map) {
        return (a as any[]).map(elem => this.convertValues(elem, classs))
      }
      else if (typeof a === 'object') {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key])
          }
          return a
        }
        return new classs(a)
      }
      return a
    }
  }

  export class TokenUsage {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number

    static createFrom(source: any = {}) {
      return new TokenUsage(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.prompt_tokens = source.prompt_tokens
      this.completion_tokens = source.completion_tokens
      this.total_tokens = source.total_tokens
    }
  }

  export class DeepSeekAPIResponse {
    id: string
    object: string
    created: number
    model: string
    choices: DeepSeekChoice[]
    usage: TokenUsage

    static createFrom(source: any = {}) {
      return new DeepSeekAPIResponse(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.id = source.id
      this.object = source.object
      this.created = source.created
      this.model = source.model
      this.choices = this.convertValues(source.choices, DeepSeekChoice)
      this.usage = this.convertValues(source.usage, TokenUsage)
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a
      }
      if (a.slice && a.map) {
        return (a as any[]).map(elem => this.convertValues(elem, classs))
      }
      else if (typeof a === 'object') {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key])
          }
          return a
        }
        return new classs(a)
      }
      return a
    }
  }

  export class TaskPlan {
    name: string
    mode: string
    focusDuration: number
    breakDuration: number

    static createFrom(source: any = {}) {
      return new TaskPlan(source)
    }

    constructor(source: any = {}) {
      if (typeof source === 'string')
        source = JSON.parse(source)
      this.name = source.name
      this.mode = source.mode
      this.focusDuration = source.focusDuration
      this.breakDuration = source.breakDuration
    }
  }

}
