class Ai {
  constructor(options = {}) {
    this.options = options
    this.controller = null
    this.currentChunk = ''
    this.content = ''
  }

  // 废弃的初始化方法，现在配置直接在构造函数中传入
  init(type = 'huoshan', options = {}) {
    console.warn('Ai.init() is deprecated. Pass config directly to constructor.')
    this.options = {
      ...this.options,
      ...options
    }
  }

  async request(data, progress = () => {}, end = () => {}, err = () => {}) {
    try {
      const res = await this.postMsg(data)
      const decoder = new TextDecoder()
      
      // 统一使用 OpenAI 格式处理（后端已统一转为 OpenAI 兼容格式）
      while (1) {
        const { done, value } = await res.read()
        if (done) {
          end(this.content)
          return
        }
        
        // 拿到当前切片的数据
        const text = decoder.decode(value)
        
        // 处理切片数据
        let chunk = this.handleChunkData(text)
        
        // 判断是否有不完整切片，如果有，合并下一次处理，没有则获取数据
        if (this.currentChunk) continue
        
        let isEnd = false
        const list = chunk
          .split('\n')
          .filter(item => {
            isEnd = item.includes('[DONE]')
            return !!item && !isEnd
          })
          .map(item => {
            try {
              return JSON.parse(item.replace(/^data:/, ''))
            } catch (e) {
              return null
            }
          })
          .filter(Boolean)
        
        list.forEach(item => {
          if (item.choices) {
            this.content += item.choices
              .map(item2 => {
                return item2.delta?.content || ''
              })
              .join('')
          }
        })
        
        progress(this.content)
        
        if (isEnd) {
          end(this.content)
        }
      }
    } catch (error) {
      console.log(error)
      // 手动停止请求不需要触发错误回调
      if (!(error && error.name === 'AbortError')) {
        err(error)
      }
    }
  }

  async postMsg(data) {
    this.controller = new AbortController()

    // 使用本地代理，但传入大模型配置
    const { baseUrl, apiKey, model, enableThinking } = this.options

    // 使用相对路径，通过 Vue devServer 代理到后端服务
    const res = await fetch('/ai/chat', {
      signal: this.controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // 大模型服务配置
        baseUrl: baseUrl,
        apiKey: apiKey,
        model: model,
        enableThinking: enableThinking || false,
        // 消息内容
        messages: data.messages,
        stream: true
      })
    })
    
    if (res.status && res.status !== 200) {
      const error = await res.text()
      throw new Error(error || '请求失败')
    }
    
    return res.body.getReader()
  }

  handleChunkData(chunk) {
    chunk = chunk.trim()
    
    // 如果存在上一个切片
    if (this.currentChunk) {
      chunk = this.currentChunk + chunk
      this.currentChunk = ''
    }
    
    // 如果存在done,认为是完整切片且是最后一个切片
    if (chunk.includes('[DONE]')) {
      return chunk
    }
    
    // 最后一个字符串不为}，则默认切片不完整，保存与下次拼接使用
    if (chunk && chunk[chunk.length - 1] !== '}') {
      this.currentChunk = chunk
      return ''
    }
    
    return chunk
  }

  stop() {
    if (this.controller) {
      this.controller.abort()
      this.controller = new AbortController()
    }
  }
}

export default Ai
