<template>
  <el-dialog
    class="aiConfigDialog"
    :title="$t('ai.AIConfiguration')"
    :visible.sync="dialogVisible"
    width="600px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="config-container">
      <!-- 测试结果 - 浮动在顶部 -->
      <div v-if="testResult" class="test-result" :class="testResult.status">
        <i :class="testResult.icon"></i>
        <span>{{ testResult.message }}</span>
      </div>
      
      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-width="100px"
      >
        <!-- 大模型服务配置 -->
        <div class="config-section">
          <h3 class="section-title">
            <i class="el-icon-cpu"></i>
            {{ $t('ai.largeModelConfiguration') }}
          </h3>
          <p class="section-desc">
            {{ $t('ai.largeModelDesc') }}
          </p>
          
          <el-form-item :label="$t('ai.baseUrl')" prop="baseUrl">
            <el-input 
              v-model="form.baseUrl" 
              :placeholder="$t('ai.baseUrlPlaceholder')"
            >
              <el-select 
                v-model="provider" 
                slot="prepend" 
                :placeholder="$t('ai.quickSelect')"
                style="width: 130px;"
                @change="onProviderChange"
              >
                <el-option :label="$t('ai.custom')" value="custom"></el-option>
                <el-option label="OpenAI" value="openai"></el-option>
                <el-option label="Azure" value="azure"></el-option>
                <el-option :label="$t('ai.volcengine')" value="volcengine"></el-option>
                <el-option :label="$t('ai.zhipu')" value="zhipu"></el-option>
                <el-option :label="$t('ai.qianfan')" value="qianfan"></el-option>
                <el-option :label="$t('ai.ollama')" value="ollama"></el-option>
                <el-option :label="$t('ai.lmstudio')" value="lmstudio"></el-option>
                <el-option :label="$t('ai.xinference')" value="xinference"></el-option>
              </el-select>
            </el-input>
            <div class="form-tip">
              <i class="el-icon-info"></i>
              {{ $t('ai.baseUrlTip') }}
            </div>
          </el-form-item>
          
          <el-form-item :label="$t('ai.apiKey')" prop="apiKey">
            <el-input 
              v-model="form.apiKey" 
              :type="showKey ? 'text' : 'password'"
              :placeholder="$t('ai.apiKeyPlaceholder')"
            >
              <el-button 
                slot="append" 
                @click="showKey = !showKey"
              >{{ showKey ? $t('ai.hide') : $t('ai.show') }}</el-button>
            </el-input>
          </el-form-item>
          
          <el-form-item :label="$t('ai.model')" prop="model">
            <el-input 
              v-model="form.model" 
              :placeholder="$t('ai.modelPlaceholder')"
            >
              <el-button 
                slot="append" 
                icon="el-icon-question"
                @click="showModelHelp"
              ></el-button>
            </el-input>
            <div class="form-tip">
              <i class="el-icon-info"></i>
              {{ $t('ai.modelTip') }}
            </div>
          </el-form-item>

          <el-form-item :label="$t('ai.enableThinking')">
            <el-switch
              v-model="form.enableThinking"
            ></el-switch>
            <div class="form-tip">
              <i class="el-icon-info"></i>
              {{ $t('ai.enableThinkingDesc') }}
            </div>
          </el-form-item>
        </div>

      </el-form>
    </div>
    
    <div slot="footer">
      <el-button @click="cancel">{{ $t('ai.cancel') }}</el-button>
      <el-button @click="test" :loading="testing">{{ $t('ai.test') }}</el-button>
      <el-button type="primary" @click="save" :loading="saving">{{ $t('ai.confirm') }}</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

// 服务商预设
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelPlaceholder: 'gpt-4'
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: 'https://{your-resource}.openai.azure.com/openai/deployments/{deployment}',
    modelPlaceholder: '{deployment-name}'
  },
  volcengine: {
    name: 'Volcano Engine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    modelPlaceholder: 'ep-20240214-xxxxx'
  },
  zhipu: {
    name: 'Zhipu AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelPlaceholder: 'glm-4'
  },
  qianfan: {
    name: 'Baidu Qianfan',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    modelPlaceholder: 'ernie-bot-4'
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    modelPlaceholder: 'llama2'
  },
  lmstudio: {
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    modelPlaceholder: 'deepseek-ai/DeepSeek-R1'
  },
  xinference: {
    name: 'Xinference',
    baseUrl: 'http://localhost:9997/v1',
    modelPlaceholder: 'glm-4.7-flash'
  },
  custom: {
    name: 'Custom',
    baseUrl: '',
    modelPlaceholder: 'model-name'
  }
}

export default {
  model: {
    prop: 'visible',
    event: 'change'
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: false,
      provider: 'custom',
      showKey: false,
      testing: false,
      saving: false,
      testResult: null,
      testResultTimer: null,
      
      form: {
        baseUrl: '',
        apiKey: '',
        model: ''
      },
      
      rules: {
        baseUrl: [
          { required: true, message: this.$t('ai.baseUrlRequired'), trigger: 'blur' },
          { pattern: /^https?:\/\/.+/, message: this.$t('ai.baseUrlInvalid'), trigger: 'blur' }
        ],
        apiKey: [
          { required: true, message: this.$t('ai.apiKeyRequired'), trigger: 'blur' }
        ],
        model: [
          { required: true, message: this.$t('ai.modelRequired'), trigger: 'blur' }
        ]
      }
    }
  },
  
  computed: {
    ...mapState(['aiConfig'])
  },
  
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) this.init()
    }
  },

  destroyed() {
    // 组件销毁时清除定时器
    if (this.testResultTimer) {
      clearTimeout(this.testResultTimer)
    }
  },

  methods: {
    ...mapMutations(['setLocalConfig']),
    
    handleClose() {
      this.$emit('change', false)
    },
    
    init() {
      // 从 store 加载配置
      console.log('[AiConfig] init() called. aiConfig:', this.aiConfig)
      // 先重置表单到默认值，再合并保存的配置
      this.resetForm()
      // 清除测试结果和定时器
      this.testResult = null
      if (this.testResultTimer) {
        clearTimeout(this.testResultTimer)
        this.testResultTimer = null
      }
      Object.assign(this.form, this.aiConfig)
      console.log('[AiConfig] After assign, form:', { ...this.form, apiKey: this.form.apiKey ? '***' : '' })

      // 优先使用保存的 provider，如果没有则通过地址检测
      if (this.aiConfig.provider && this.aiConfig.provider !== 'custom') {
        this.provider = this.aiConfig.provider
        console.log('[AiConfig] Using saved provider:', this.provider)
      } else {
        this.detectProvider()
      }
    },
    
    resetForm() {
      this.form = {
        baseUrl: '',
        apiKey: '',
        model: '',
        enableThinking: false
      }
    },
    
    detectProvider() {
      // 根据当前 baseUrl 检测服务商
      console.log('[AiConfig] Detecting provider for baseUrl:', this.form.baseUrl)
      
      for (const [key, config] of Object.entries(PROVIDERS)) {
        if (config.baseUrl) {
          // 提取主机地址（去掉协议和路径）
          const configHost = config.baseUrl.replace(/^https?:\/\//, '').split('/')[0]
          const formHost = this.form.baseUrl.replace(/^https?:\/\//, '').split('/')[0]
          
          console.log(`[AiConfig] Comparing: formHost="${formHost}" vs configHost="${configHost}" (${key})`)
          
          if (formHost === configHost) {
            this.provider = key
            console.log('[AiConfig] Provider detected:', key)
            return
          }
        }
      }
      this.provider = 'custom'
      console.log('[AiConfig] Provider not matched, using custom')
    },
    
    onProviderChange(provider) {
      const config = PROVIDERS[provider]
      if (config && config.baseUrl) {
        this.form.baseUrl = config.baseUrl
        // 如果模型名为空，填入示例
        if (!this.form.model) {
          this.form.model = config.modelPlaceholder
        }
      }
    },
    
    showModelHelp() {
      this.$alert(
        this.$t('ai.modelHelpContent'),
        this.$t('ai.modelHelpTitle'),
        { dangerouslyUseHTMLString: true }
      )
    },
    
    async test() {
      this.testing = true
      this.testResult = null

      // 清除之前的定时器
      if (this.testResultTimer) {
        clearTimeout(this.testResultTimer)
        this.testResultTimer = null
      }

      try {
        // 测试大模型连接
        const res = await fetch(`${this.form.baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${this.form.apiKey}` }
        })

        if (res.ok) {
          this.testResult = {
            status: 'success',
            icon: 'el-icon-check',
            message: this.$t('ai.testSuccess')
          }
        } else {
          this.testResult = {
            status: 'error',
            icon: 'el-icon-close',
            message: `${this.$t('ai.testFailed')}: ${res.status}`
          }
        }
      } catch (error) {
        this.testResult = {
          status: 'error',
          icon: 'el-icon-close',
          message: `${this.$t('ai.testFailed')}: ${error.message}`
        }
      } finally {
        this.testing = false
        // 3秒后自动隐藏测试结果
        this.testResultTimer = setTimeout(() => {
          this.testResult = null
        }, 3000)
      }
    },
    
    cancel() {
      this.$emit('change', false)
    },
    
    save() {
      this.$refs.formRef.validate(valid => {
        if (valid) {
          console.log('[AiConfig] Saving config:', { ...this.form, apiKey: '***' })
          console.log('[AiConfig] Current provider:', this.provider)
          // 保存 provider 到配置中
          this.setLocalConfig({ 
            ...this.form,
            provider: this.provider 
          })
          this.$message.success(this.$t('ai.configSaveSuccess'))
          this.$emit('change', false)
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.aiConfigDialog {
  /deep/ .el-dialog__body {
    padding: 20px;
    max-height: 700px;
    overflow-y: auto;
  }

  .config-container {
    position: relative;
    padding-top: 0;

    .config-section {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid #ebeef5;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
    }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      
      i {
        margin-right: 8px;
        color: #409eff;
      }
    }

    .section-desc {
      font-size: 12px;
      color: #909399;
      margin-bottom: 16px;
      padding-left: 24px;
    }

    .form-tip {
      font-size: 12px;
      color: #909399;
      margin-top: 5px;
      
      i {
        margin-right: 4px;
      }
    }

    .input-hint {
      margin-left: 10px;
      color: #909399;
      font-size: 12px;
    }

    .test-result {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 12px;
      border-radius: 4px;
      display: flex;
      align-items: center;

      &.success {
        background: #f0f9eb;
        color: #67c23a;
      }

      &.error {
        background: #fef0f0;
        color: #f56c6c;
      }

      i {
        margin-right: 8px;
      }
    }
  }
}
</style>
