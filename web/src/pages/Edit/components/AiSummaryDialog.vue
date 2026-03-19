<template>
  <div class="aiSummaryDialogWrapper">
    <!-- AI文件总结弹窗 -->
    <el-dialog
      class="aiSummaryDialog"
      :title="$t('ai.aiSummaryTitle')"
      :visible.sync="dialogVisible"
      width="550px"
      append-to-body
    >
      <div class="contentBox">
        <!-- 文件上传区域 -->
        <div class="uploadArea" v-if="!isProcessing && !summaryResult">
          <!-- 1. 分析配置卡片 -->
          <div class="configCard">
            <div class="cardTitle">
              <i class="el-icon-setting"></i>
              <span>1. {{ $t('ai.analysisConfigTitle') || '分析配置' }}</span>
            </div>
            <div class="cardContent">
              <!-- 自定义提示词输入区域 -->
              <div class="customPromptSection">
                <div class="customPromptHeader">
                  <span>{{ $t('ai.customPromptTitle') }}</span>
                  <el-tooltip :content="$t('ai.customPromptTooltip')" placement="top">
                    <i class="el-icon-question"></i>
                  </el-tooltip>
                </div>
                <el-input
                  v-model="customPrompt"
                  type="textarea"
                  :rows="3"
                  :placeholder="$t('ai.customPromptPlaceholder')"
                  resize="none"
                  class="customPromptInput"
                ></el-input>
              </div>

              <!-- AI配置状态 -->
              <div class="aiConfigStatus">
                <div class="configRow">
                  <span class="configLabel">{{ $t('ai.aiServiceStatus') || 'AI服务' }}：</span>
                  <el-tag v-if="isAiConfigValid" type="success" size="mini">
                    <i class="el-icon-check"></i> {{ $t('ai.configured') || '已配置' }}
                  </el-tag>
                  <el-tag v-else type="warning" size="mini">
                    <i class="el-icon-warning"></i> {{ $t('ai.notConfigured') || '未配置' }}
                  </el-tag>
                  <el-button 
                    type="text" 
                    size="mini" 
                    @click="showAiConfigDialog"
                    class="configBtn"
                  >
                    {{ isAiConfigValid ? ($t('ai.modifyConfig') || '修改配置') : ($t('ai.configureNow') || '立即配置') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. 上传文件卡片 -->
          <div class="uploadCard">
            <div class="cardTitle">
              <i class="el-icon-upload2"></i>
              <span>2. {{ $t('ai.uploadFileTitle') || '上传文件' }}</span>
            </div>
            <div class="cardContent">
              <el-upload
                class="uploadComponent"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
                accept=".pdf,.md,.txt"
              >
                <div class="uploadInner">
                  <i class="el-icon-upload"></i>
                  <div class="uploadMainText">
                    {{ $t('ai.dropFileTip') }}
                  </div>
                  <div class="uploadSubText">
                    {{ $t('ai.supportFileTypes') }}
                  </div>
                </div>
              </el-upload>
            </div>
          </div>

          <!-- 底部警告提示 -->
          <div class="bottomWarning" v-if="!isProcessing && !summaryResult">
            <i class="el-icon-warning-outline"></i>
            <span>{{ $t('ai.importantTip') }}</span>
          </div>
        </div>

        <!-- 处理中状态 -->
        <div class="processingArea" v-if="isProcessing">
          <div
            class="processingStep"
            v-for="(step, index) in processingSteps"
            :key="index"
          >
            <div class="stepIcon">
              <i v-if="step.status === 'pending'" class="el-icon-loading"></i>
              <i
                v-else-if="step.status === 'success'"
                class="el-icon-check"
              ></i>
              <i v-else class="el-icon-close"></i>
            </div>
            <div class="stepContent">
              <div class="stepTitle">{{ step.title }}</div>
              <div class="stepDesc" v-if="step.desc">{{ step.desc }}</div>
            </div>
          </div>
          <el-progress
            :percentage="progressPercent"
            :show-text="false"
            v-if="isProcessing"
          ></el-progress>
        </div>

        <!-- 总结结果预览 -->
        <div class="resultArea" v-if="summaryResult && !isProcessing">
          <div class="resultHeader">
            <span>{{ $t('ai.summaryResult') }}</span>
            <el-button type="text" size="mini" @click="regenerate">
              {{ $t('ai.regenerate') }}
            </el-button>
          </div>
          <div class="resultContent customScrollbar">
            <pre>{{ summaryResult }}</pre>
          </div>
        </div>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button @click="closeDialog" v-if="!isProcessing">
          {{ $t('ai.cancel') }}
        </el-button>
        <el-button
          type="primary"
          @click="confirmImport"
          v-if="summaryResult && !isProcessing"
          :loading="isImporting"
        >
          {{ $t('ai.confirmImport') }}
        </el-button>
        <el-button type="warning" @click="stopProcess" v-if="isProcessing">
          {{
            isStreaming ? '停止分析（保留已分析内容）' : $t('ai.stopGenerating')
          }}
        </el-button>
      </div>
    </el-dialog>

    <AiConfigDialog v-model="aiConfigDialogVisible"></AiConfigDialog>
  </div>
</template>

<script>
import AiConfigDialog from './AiConfigDialog.vue'
import Ai from '@/utils/ai'
import { mapState } from 'vuex'
import { transformMarkdownTo } from 'simple-mind-map/src/parse/markdownTo'

export default {
  name: 'AiSummaryDialog',
  components: {
    AiConfigDialog
  },
  props: {
    mindMap: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      dialogVisible: false,
      aiConfigDialogVisible: false,
      isProcessing: false,
      isImporting: false,
      fileContent: '',
      summaryResult: '',
      currentFile: null,
      fileId: null,
      fileName: null,
      uploadResult: null,
      progressPercent: 0,
      processingSteps: [],
      aiInstance: null,
      fileSize: 0,
      // 流式更新相关状态
      isStreaming: false,
      currentFramework: '',
      analyzedChapterGroups: [],
      totalGroups: 0,
      currentGroupIndex: 0,
      stopRequested: false,
      // 自定义提示词
      customPrompt: '',
      showCustomPrompt: true
    }
  },
  computed: {
    ...mapState(['aiConfig']),
    // 检查AI配置是否完整
    isAiConfigValid() {
      return this.aiConfig && 
             this.aiConfig.baseUrl && 
             this.aiConfig.apiKey && 
             this.aiConfig.model
    }
  },
  created() {
    this.$bus.$on('ai_summary_file', this.showDialog)
  },
  beforeDestroy() {
    this.$bus.$off('ai_summary_file', this.showDialog)
  },
  methods: {
    // 显示弹窗
    showDialog() {
      this.resetData()
      this.dialogVisible = true
    },

    // 关闭弹窗
    closeDialog() {
      this.dialogVisible = false
      this.resetData()
    },

    // 重置数据
    resetData() {
      this.fileContent = ''
      this.summaryResult = ''
      this.currentFile = null
      this.fileId = null
      this.fileName = null
      this.progressPercent = 0
      this.isProcessing = false
      this.isImporting = false
      this.processingSteps = []
      this.aiInstance = null
      this.fileSize = 0
      // 重置流式更新相关状态
      this.isStreaming = false
      this.currentFramework = ''
      this.analyzedChapterGroups = []
      this.totalGroups = 0
      this.currentGroupIndex = 0
      this.stopRequested = false
      // 重置自定义提示词（保留用户输入，不清空）
      // this.customPrompt = ''
      // this.showCustomPrompt = false
    },

    // 显示AI配置弹窗
    showAiConfigDialog() {
      this.aiConfigDialogVisible = true
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },

    // 文件选择变化
    handleFileChange(file) {
      this.currentFile = file.raw
      this.fileSize = file.size || 0

      this.startProcess()
    },

    // 开始处理流程
    async startProcess() {
      if (!this.currentFile) return

      // 检查AI配置
      const configValid = await this.checkAIConfig()
      if (!configValid) return

      this.isProcessing = true
      this.progressPercent = 0

      // 处理步骤
      this.processingSteps = [
        { title: '上传文件并解析', status: 'pending', desc: '' },
        { title: '生成文档框架', status: 'pending', desc: '' },
        { title: '分析各章节详情', status: 'pending', desc: '' },
        { title: '组装思维导图', status: 'pending', desc: '' }
      ]

      try {
        // 步骤0：上传文件到后端进行解析
        this.processingSteps[0].status = 'pending'
        this.processingSteps[0].desc = '正在上传和解析文档...'
        await this.uploadAndVectorize()
        this.processingSteps[0].status = 'success'
        this.progressPercent = 20

        // AI 大模型分析
        this.processingSteps[1].status = 'pending'
        this.processingSteps[2].status = 'pending'
        this.processingSteps[3].status = 'pending'
        await this.analyzeContent()
        this.processingSteps[1].status = 'success'
        this.processingSteps[2].status = 'success'
        this.processingSteps[3].status = 'success'

        this.progressPercent = 100
        this.isProcessing = false
      } catch (error) {
        console.error('分析失败:', error)
        this.$message.error(error.message || this.$t('ai.generationFailed'))
        this.isProcessing = false
      }
    },

    // 上传文件到后端进行解析
    async uploadAndVectorize() {
      if (!this.currentFile) return

      const formData = new FormData()
      formData.append('file', this.currentFile)
      formData.append('fileName', this.currentFile.name)

      console.log('📤 开始上传文件:', this.currentFile.name)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '上传失败')
      }

      const result = await response.json()
      console.log('✅ 文件解析完成:', result.data)

      // 保存上传结果
      this.uploadResult = result.data
      this.fileId = result.data.fileId
      this.fileName = result.data.fileName
    },

    // 检查AI配置
    async checkAIConfig() {
      // 检查新的配置字段
      if (!this.aiConfig.baseUrl || !this.aiConfig.apiKey || !this.aiConfig.model) {
        this.$message.warning(this.$t('ai.configurationMissing'))
        this.showAiConfigDialog()
        return false
      }

      try {
        const res = await fetch('/ai/test', {
          method: 'GET'
        })
        if (!res.ok) throw new Error('连接失败')
        return true
      } catch (error) {
        this.$message.error(this.$t('ai.connectFailed'))
        return false
      }
    },

    // 读取文件内容
    readFile() {
      return new Promise((resolve, reject) => {
        const file = this.currentFile
        const fileName = file.name.toLowerCase()

        if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
          // 文本文件直接读取
          const reader = new FileReader()
          reader.onload = (e) => {
            this.fileContent = e.target.result
            resolve()
          }
          reader.onerror = reject
          reader.readAsText(file)
        } else if (fileName.endsWith('.pdf')) {
          // PDF文件处理
          this.readPDFFile(file)
            .then(content => {
              this.fileContent = content
              resolve()
            })
            .catch(reject)
        } else {
          reject(new Error(this.$t('ai.unsupportedFileType')))
        }
      })
    },

    // 读取PDF文件（使用pdfjs-dist CDN版本）
    async readPDFFile(file) {
      try {
        // 检查pdf.js是否已加载
        if (!window.pdfjsLib) {
          await this.loadPDFJS()
        }

        const pdfjsLib = window.pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'

        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

        let fullText = ''

        // 遍历所有页面提取文本
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map(item => item.str).join(' ')
          fullText += pageText + '\n'
        }

        if (!fullText.trim()) {
          throw new Error('PDF中未提取到文本内容，可能是扫描版PDF')
        }

        return fullText
      } catch (error) {
        console.error('PDF解析失败:', error)
        throw new Error(`PDF解析失败: ${error.message}`)
      }
    },

    // 动态加载PDF.js库
    loadPDFJS() {
      return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'
        script.onload = () => {
          resolve()
        }
        script.onerror = () => {
          reject(new Error('加载PDF.js库失败'))
        }
        document.head.appendChild(script)
      })
    },

    // AI分析内容 - 分层生成思维导图（智能分组 + 流式更新）
    async analyzeContent() {
      try {
        this.isStreaming = true
        this.stopRequested = false

        // 步骤1：获取文档章节结构
        this.processingSteps[1].desc = '正在获取文档章节结构...'
        const docStats = await this.getDocumentStats()
        console.log('📊 文档结构:', docStats)

        if (!docStats.chapters || docStats.chapters.length === 0) {
          throw new Error('无法获取文档章节结构')
        }

        // 后端已经过滤掉英文章节，直接使用
        const validChapters = docStats.chapters
        console.log(`📚 有效章节数: ${validChapters.length}`)

        if (validChapters.length === 0) {
          throw new Error('未找到有效的中文章节')
        }

        // 初始化 AI 实例
        this.aiInstance = new Ai({
          baseUrl: this.aiConfig.baseUrl,
          apiKey: this.aiConfig.apiKey,
          model: this.aiConfig.model,
          enableThinking: this.aiConfig.enableThinking
        })

        // 估算文档总长度，判断是否走简化流程
        const totalContentLength = this.estimateTotalContentLength(validChapters)
        console.log(`📏 估算文档总长度: ${totalContentLength} 字符`)

        // 如果文档长度低于阈值（20000），走简化流程
        if (totalContentLength <= 20000) {
          await this.analyzeShortDocument(validChapters, docStats.fileName)
        } else {
          await this.analyzeLongDocument(validChapters, docStats.fileName)
        }

      } catch (error) {
        console.error('AI分析失败:', error)
        this.isStreaming = false
        throw error
      }
    },

    // 估算文档总长度
    estimateTotalContentLength(chapters) {
      let totalLength = 0
      for (const chapter of chapters) {
        // 使用章节chunk数估算长度，每个chunk约500字
        const chunkCount = chapter.chunkCount || 1
        totalLength += chunkCount * 500
      }
      return totalLength
    },

    // 短文档简化分析流程（长度 <= 20000）
    async analyzeShortDocument(validChapters, fileName) {
      console.log('📄 文档长度较短，走简化分析流程...')
      this.processingSteps[1].desc = '文档较短，直接分析全文...'
      this.progressPercent = 40

      // 构建基础提示词
      let analyzePrompt = `请根据以下文档内容，生成结构清晰的思维导图。

要求：
1. 使用Markdown格式，根节点用 # 标题
2. 层级结构：## 一级主题 ### 二级主题 #### 三级细节
3. 每个节点要有实质内容，不能只写标题
4. 内容应简洁明了，重点突出
5. 直接输出完整的思维导图，不要分步生成`

      // 追加用户自定义提示词
      if (this.customPrompt && this.customPrompt.trim()) {
        analyzePrompt += `\n\n【用户补充要求】\n${this.customPrompt.trim()}`
        console.log('📝 已追加用户自定义提示词')
      }

      const analyzeResponse = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName,
          prompt: analyzePrompt,
          threshold: 20000,
          baseUrl: this.aiConfig.baseUrl,
          apiKey: this.aiConfig.apiKey,
          model: this.aiConfig.model
        })
      })

      if (!analyzeResponse.ok) {
        const error = await analyzeResponse.json()
        throw new Error(error.detail || '分析失败')
      }

      const analyzeResult = await analyzeResponse.json()
      console.log('📥 短文档分析结果:', analyzeResult)

      if (analyzeResult.success && analyzeResult.content) {
        // 直接使用分析结果
        this.summaryResult = this.normalizeMarkdown(analyzeResult.content)

        // 实时更新到思维导图
        if (this.mindMap) {
          try {
            const treeData = transformMarkdownTo(this.summaryResult)
            this.mindMap.setData(treeData)
            console.log('✅ 短文档分析完成，已更新思维导图')
          } catch (e) {
            console.warn('更新思维导图失败:', e.message)
          }
        }
      } else {
        throw new Error(analyzeResult.error || '分析失败')
      }

      this.processingSteps[1].desc = '分析完成！'
      this.progressPercent = 100
      this.isStreaming = false
    },

    // 长文档分析流程（长度 > 20000）- 后端主导 + SSE进度推送
    async analyzeLongDocument(validChapters, fileName) {
      console.log('📄 文档长度较长，走后端主导分析流程...')
      
      // 更新UI状态
      this.processingSteps[1].desc = '启动长文档分析任务...'
      this.processingSteps[1].status = 'success'
      this.processingSteps[2].status = 'pending'
      this.processingSteps[2].desc = '等待后端处理...'
      
      try {
        // 1. 启动分析任务
        const requestBody = {
          fileName: fileName,
          baseUrl: this.aiConfig.baseUrl,
          apiKey: this.aiConfig.apiKey,
          model: this.aiConfig.model
        }
        
        // 添加自定义提示词（如果有）
        if (this.customPrompt && this.customPrompt.trim()) {
          requestBody.customPrompt = this.customPrompt.trim()
          console.log('📝 长文档分析：已添加用户自定义提示词')
        }
        
        const startResponse = await fetch('/api/documents/analyze-long', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        if (!startResponse.ok) {
          const error = await startResponse.json()
          throw new Error(error.detail || '启动分析任务失败')
        }
        
        const { taskId } = await startResponse.json()
        console.log(`✅ 分析任务已启动: ${taskId}`)
        
        // 2. 建立SSE连接接收进度
        await this.connectToProgressStream(taskId)
        
      } catch (error) {
        console.error('长文档分析失败:', error)
        throw error
      }
    },

    // 连接SSE进度流
    connectToProgressStream(taskId) {
      return new Promise((resolve, reject) => {
        console.log('🔗 连接SSE进度流...')
        
        const eventSource = new EventSource(`/api/documents/analysis/${taskId}/progress`)
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📥 SSE事件:', data)
            
            // 更新进度
            this.progressPercent = data.progress
            this.processingSteps[2].desc = data.message
            
            // 根据阶段更新步骤状态
            if (data.stage === 'extract') {
              this.processingSteps[1].status = 'success'
              this.processingSteps[2].status = 'pending'
            } else if (data.stage === 'refine') {
              this.processingSteps[1].status = 'success'
              this.processingSteps[2].status = 'pending'
            } else if (data.stage === 'mindmap') {
              this.processingSteps[2].status = 'pending'
            }
            
            // 处理完成
            if (data.type === 'complete') {
              eventSource.close()
              
              // 记录原始结果
              console.log('📥 原始结果（前1000字符）:', data.result.substring(0, 1000))
              console.log('📥 原始结果总行数:', data.result.split('\n').length)
              
              // 保存结果
              this.summaryResult = this.normalizeMarkdown(data.result)
              
              // 记录处理后结果
              console.log('📝 处理后结果（前1000字符）:', this.summaryResult.substring(0, 1000))
              console.log('📝 处理后结果总行数:', this.summaryResult.split('\n').length)
              
              // 更新思维导图
              if (this.mindMap) {
                try {
                  const treeData = transformMarkdownTo(this.summaryResult)
                  this.mindMap.setData(treeData)
                  console.log('✅ 长文档分析完成，已更新思维导图')
                } catch (e) {
                  console.warn('更新思维导图失败:', e.message)
                }
              }
              
              // 更新步骤状态
              this.processingSteps[2].status = 'success'
              this.processingSteps[2].desc = '分析完成！'
              this.processingSteps[3].status = 'success'
              this.progressPercent = 100
              this.isStreaming = false
              
              resolve()
            }
            
            // 处理错误
            if (data.type === 'error') {
              eventSource.close()
              this.processingSteps[2].status = 'error'
              this.processingSteps[2].desc = data.message
              reject(new Error(data.error || data.message))
            }
            
          } catch (e) {
            console.error('解析SSE数据失败:', e)
          }
        }
        
        eventSource.onerror = (error) => {
          console.error('SSE连接错误:', error)
          eventSource.close()
          
          // 如果已经收到了完成事件，不报错
          if (this.progressPercent >= 100) {
            resolve()
          } else {
            reject(new Error('SSE连接中断'))
          }
        }
      })
    },

    // 使用规则（非AI）分析文档
    async analyzeWithRules() {
      try {
        this.processingSteps[1].status = 'pending'
        this.processingSteps[1].desc = '正在提取章节结构...'

        // 获取文档结构
        const docStats = await this.getDocumentStats()
        console.log('📊 文档结构:', docStats)

        if (!docStats.chapters || docStats.chapters.length === 0) {
          throw new Error('无法获取文档章节结构')
        }

        // 后端已经过滤掉英文章节，直接使用
        const validChapters = docStats.chapters
        console.log(`📚 有效章节数: ${validChapters.length}`)

        if (validChapters.length === 0) {
          throw new Error('未找到有效的中文章节')
        }

        this.processingSteps[1].status = 'success'
        this.progressPercent = 40

        // 步骤2：提取各章节关键信息
        this.processingSteps[2].status = 'pending'
        this.processingSteps[2].desc = '正在提取关键信息...'

        const chapterAnalysis = []
        const totalChapters = validChapters.length

        for (let i = 0; i < totalChapters; i++) {
          const chapter = validChapters[i]
          this.processingSteps[2].desc = `正在处理第 ${i + 1}/${totalChapters} 章: ${chapter.title}`

          try {
            // 获取章节内容
            const content = await this.getChapterContent(chapter.id, docStats.fileName)

            if (content && content.length > 50) {
              // 使用规则提取关键信息
              const analysis = this.extractKeyInfo(chapter, content, i + 1, totalChapters)
              chapterAnalysis.push(analysis)
            }
          } catch (e) {
            console.warn(`处理章节 "${chapter.title}" 失败:`, e.message)
          }

          // 更新进度 (40% ~ 80%)
          this.progressPercent = 40 + Math.floor((i + 1) / totalChapters * 40)
        }

        console.log(`📄 处理完成 ${chapterAnalysis.length} 个章节`)

        // 步骤3：生成思维导图
        this.processingSteps[2].status = 'success'
        this.processingSteps[3].status = 'pending'
        this.processingSteps[3].desc = '正在生成思维导图...'

        const mindMapContent = this.generateMindMapFromRules(validChapters, chapterAnalysis, docStats.fileName)
        this.summaryResult = this.normalizeMarkdown(mindMapContent)

        this.processingSteps[3].status = 'success'
        this.progressPercent = 100

      } catch (error) {
        console.error('规则分析失败:', error)
        throw error
      }
    },

    // 使用 Phi-3 一次性分析整个文档
    async analyzeWithPhi() {
      try {
        this.isStreaming = true
        this.stopRequested = false

        // 步骤1：获取文档结构
        this.processingSteps[1].desc = '正在获取文档章节结构...'
        const docStats = await this.getDocumentStats()
        console.log('📊 文档结构:', docStats)

        if (!docStats.chapters || docStats.chapters.length === 0) {
          throw new Error('无法获取文档章节结构')
        }

        // 后端已经过滤掉英文章节，直接使用
        const validChapters = docStats.chapters
        console.log(`📚 有效章节数: ${validChapters.length}`)

        if (validChapters.length === 0) {
          throw new Error('未找到有效的中文章节')
        }

        // 初始化 AI 实例
        this.aiInstance = new Ai({
          baseUrl: this.aiConfig.baseUrl,
          apiKey: this.aiConfig.apiKey,
          model: this.aiConfig.model,
          enableThinking: this.aiConfig.enableThinking
        })

        // 步骤2：获取所有章节内容
        this.processingSteps[1].desc = '正在获取章节内容...'
        this.progressPercent = 20

        const allContent = await this.getAllChaptersContent(validChapters, docStats.fileName)
        console.log(`📄 获取内容总长度: ${allContent.length} 字符`)

        // 步骤3：一次性发送给大模型分析
        this.processingSteps[1].desc = '正在分析文档...'
        this.progressPercent = 40

        const result = await this.analyzeFullDocumentPhi(validChapters, allContent, docStats.fileName)

        this.summaryResult = this.normalizeMarkdown(result)
        this.progressPercent = 100
        this.isStreaming = false

      } catch (error) {
        console.error('Phi-3分析失败:', error)
        this.isStreaming = false
        throw error
      }
    },

    // 获取所有章节内容
    async getAllChaptersContent(chapters, fileName) {
      const contents = []
      for (const chapter of chapters) {
        try {
          const content = await this.getChapterContent(chapter.id, fileName)
          if (content && content.length > 50) {
            contents.push({
              title: chapter.title,
              content: content
            })
          }
        } catch (e) {
          console.warn(`获取章节 "${chapter.title}" 失败:`, e.message)
        }
      }

      // 组装内容
      let assembled = ''
      for (const item of contents) {
        assembled += `【${item.title}】\n${item.content}\n\n`
      }

      return assembled
    },

    // 一次性分析整个文档
    async analyzeFullDocumentPhi(chapters, content, fileName) {
      return new Promise((resolve, reject) => {
        // 提取章节标题列表
        let chapterList = ''
        chapters.forEach((ch, idx) => {
          chapterList += (idx + 1) + '. ' + ch.title + '\n'
        })

        const prompt = `任务：根据以下文档内容生成完整的思维导图

文档章节：
${chapterList}

格式要求：
# 文档标题
## 第一章主题
### 子主题1
- 要点1（简短）
- 要点2（简短）
### 子主题2
- 要点1（简短）
## 第二章主题
### 子主题1
- 要点1（简短）

重要规则：
1. 每个要点不超过15个字
2. 每个章节最多3个子主题
3. 只输出Markdown格式
4. 必须涵盖所有章节

文档内容：
${content}`

        let result = ''
        this.aiInstance.request(
          {
            messages: [
              { role: 'system', content: '你是思维导图生成专家。用最简短的语言生成完整的思维导图，涵盖所有章节。' },
              { role: 'user', content: prompt }
            ]
          },
          (chunk) => { result = chunk },
          (final) => {
            const finalResult = final || result
            console.log('📥 完整文档分析返回:', finalResult.substring(0, 500))
            resolve(finalResult)
          },
          (error) => { reject(error) }
        )
      })
    },

    // Phi-3 生成框架
    async generatePhiFramework(chapters, fileName) {
      return new Promise((resolve, reject) => {
        let chapterList = ''
        chapters.forEach((ch, idx) => {
          chapterList += (idx + 1) + '. ' + ch.title + '\n'
        })

        // 精简版提示词
        const prompt = `任务：生成精简的思维导图框架

格式要求：
# 文档标题
## 章节1主题（不超过10字）
## 章节2主题（不超过10字）
## 章节3主题（不超过10字）

注意：
- 只输出以上Markdown格式
- 每个章节主题不超过10个字
- 不要有其他内容

章节列表：
${chapterList}`

        let result = ''
        this.aiInstance.request(
          {
            messages: [
              { role: 'system', content: '你是一个文档结构分析助手。你的任务是根据章节列表生成思维导图框架。只输出Markdown格式内容，不要输出其他任何文字。' },
              { role: 'user', content: prompt }
            ]
          },
          (chunk) => { result = chunk },
          (final) => {
            const finalResult = final || result
            console.log('📥 Phi-3 框架返回:', finalResult.substring(0, 500))
            resolve(finalResult)
          },
          (error) => { reject(error) }
        )
      })
    },

    // Phi-3 分析章节组
    async analyzePhiGroup(group, content, index, total) {
      return new Promise((resolve, reject) => {
        const chapterTitles = group.chapters.map(c => c.title).join('、')

        // 精简版提示词，要求简短内容
        const prompt = `任务：根据以下章节内容生成精简的思维导图

格式要求：
## 章节核心主题（用一句话概括）
### 子主题1（每个不超过10个字）
- 关键要点1（不超过15个字）
- 关键要点2（不超过15个字）
### 子主题2（每个不超过10个字）
- 关键要点1（不超过15个字）

重要规则：
1. 每个节点内容必须简短，一句话概括
2. 最多3个子主题
3. 每个子主题最多2个要点
4. 只输出Markdown格式，不要解释

章节：${chapterTitles}

内容：
${content.slice(0, 2500)}`

        let result = ''
        this.aiInstance.request(
          {
            messages: [
              { role: 'system', content: '你是思维导图生成专家。请用最简短的语言生成结构。每个节点内容不超过15个字。' },
              { role: 'user', content: prompt }
            ]
          },
          (chunk) => { result = chunk },
          (final) => {
            const finalResult = final || result
            console.log(`📥 组 "${group.title}" 返回内容:`, finalResult.substring(0, 500))
            resolve(finalResult)
          },
          (error) => { reject(error) }
        )
      })
    },

    // 使用规则提取章节关键信息
    extractKeyInfo(chapter, content, index, total) {
      // 1. 提取关键句子（简化版TextRank）
      const sentences = this.extractSentences(content)
      const keySentences = this.extractKeySentences(sentences, 8)

      // 2. 提取关键词（简化版TF-IDF）
      const keywords = this.extractKeywordsFromContent(content, 12)

      // 3. 提取数字/列表项（要点）
      const bulletPoints = this.extractBulletPoints(content)

      // 4. 提取子章节结构
      const subChapters = this.extractSubChapters(content)

      return {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        level: chapter.level,
        keySentences: keySentences,
        keywords: keywords,
        bulletPoints: bulletPoints,
        subChapters: subChapters
      }
    },

    // 提取子章节结构
    extractSubChapters(text) {
      const subChapters = []

      // 匹配各种子章节标题格式
      const patterns = [
        /(\d+\.\d+)[、\.\s]+([^\n]{2,40})/g,           // 1.1 标题
        /(\d+\.\d+\.\d+)[、\.\s]+([^\n]{2,40})/g,      // 1.1.1 标题
        /（(\d+)）\s*([^\n]{2,40})/g,                  // （1）标题
        /第[一二三四五六七八九十\d]+条\s*([^\n]{2,40})/g, // 第1条 标题
      ]

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
          const title = (match[2] || match[1] || '').trim()
          // 过滤太短或太长的标题
          if (title.length >= 3 && title.length <= 50) {
            subChapters.push({
              number: match[1],
              title: title
            })
          }
        }
      }

      // 去重并返回前15个
      const unique = subChapters.filter((item, index, self) =>
        index === self.findIndex(t => t.title === item.title)
      )
      return unique.slice(0, 15)
    },

    // 分句
    extractSentences(text) {
      // 按常见标点符号分割
      const sentences = text.split(/[。！？；\n]+/).filter(s => s.trim().length > 10)
      return sentences
    },

    // 提取关键句子（简化版）
    extractKeySentences(sentences, maxCount) {
      if (sentences.length <= maxCount) return sentences

      // 简单评分：包含数字、关键词的句子更重要
      const scoreSentence = (s) => {
        let score = 0
        // 包含数字
        if (/\d+/.test(s)) score += 1
        // 包含百分号
        if (/%|百分之/.test(s)) score += 2
        // 包含"必须"、"应"、"宜"等规范用语
        if (/必须|应|宜|禁止|要求|规定/.test(s)) score += 2
        // 长度适中（不是太长也不是太短）
        if (s.length > 20 && s.length < 100) score += 1
        return score
      }

      // 按评分排序
      const scored = sentences.map(s => ({ text: s, score: scoreSentence(s) }))
      scored.sort((a, b) => b.score - a.score)

      return scored.slice(0, maxCount).map(s => s.text)
    },

    // 提取关键词（简化版TF-IDF）
    extractKeywordsFromContent(text, maxCount) {
      // 停用词
      const stopWords = ['的', '了', '和', '是', '在', '有', '与', '及', '等', '或', '为', '对', '以', '及', '由', '于', '中', '将', '把', '被']

      // 分词（简单按字符/词组）
      const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []

      // 词频统计
      const wordFreq = {}
      for (const word of words) {
        if (stopWords.includes(word)) continue
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }

      // 排序并返回前N个
      const sorted = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxCount)
        .map(([word]) => word)

      return sorted
    },

    // 提取列表项/要点
    extractBulletPoints(text) {
      const points = []

      // 匹配各种列表格式
      const patterns = [
        /(\d+)[、\.。](.{5,50})/g,           // 1. 要点 / 1、要点
        /（(\d+)）(.{5,50})/g,               // （1）要点
        /[-*•]\s*(.{5,50})/g,                 // - 要点 / * 要点
      ]

      for (const pattern of patterns) {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
          const point = match[2] || match[1]
          if (point && point.length > 5) {
            points.push(point.trim())
          }
        }
      }

      // 去重并返回前10个
      const unique = [...new Set(points)]
      return unique.slice(0, 10)
    },

    // 使用规则生成思维导图
    generateMindMapFromRules(chapters, chapterAnalysis, fileName) {
      const lines = []

      // 生成根节点：直接使用文件名
      const rootTitle = fileName
        ? fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        : '文档总结'
      lines.push(`# ${rootTitle}`)

      // 遍历章节，添加结构
      for (const analysis of chapterAnalysis) {
        // 清理章节标题
        let chapterTitle = analysis.chapterTitle
          .replace(/^第[一二三四五六七八九十百千万\d]+[章篇部节]\s*/, '')
          .replace(/^\d+[\.\s]+/, '')
          .trim()

        // 过滤无效标题
        if (!chapterTitle || chapterTitle.length < 2) continue
        if (/^[a-zA-Z]+$/.test(chapterTitle)) continue // 纯英文跳过

        // 二级节点：章节标题
        lines.push(`## ${chapterTitle}`)

        // 优先使用子章节结构
        if (analysis.subChapters && analysis.subChapters.length > 0) {
          // 三级节点：子章节
          for (const sub of analysis.subChapters.slice(0, 8)) {
            const subTitle = this.cleanSubTitle(sub.title)
            if (subTitle) {
              lines.push(`  - ${subTitle}`)
            }
          }
        }
        // 其次使用要点列表
        else if (analysis.bulletPoints && analysis.bulletPoints.length > 0) {
          for (const point of this.cleanBulletPoints(analysis.bulletPoints).slice(0, 5)) {
            lines.push(`  - ${this.truncateText(point, 60)}`)
          }
        }
        // 再次使用关键句
        else if (analysis.keySentences && analysis.keySentences.length > 0) {
          for (const sentence of this.cleanKeySentences(analysis.keySentences).slice(0, 4)) {
            lines.push(`  - ${this.truncateText(sentence, 70)}`)
          }
        }
        // 最后使用关键词
        else if (analysis.keywords && analysis.keywords.length > 0) {
          lines.push(`  - 关键词：${analysis.keywords.slice(0, 8).join('、')}`)
        }
      }

      return lines.join('\n')
    },

    // 清理子标题
    cleanSubTitle(title) {
      if (!title) return ''
      // 移除首尾空白
      title = title.trim()
      // 移除结尾的标点符号
      title = title.replace(/[。；，、:：]$/, '')
      // 过滤无效标题
      if (title.length < 2) return ''
      if (/^\d+$/.test(title)) return '' // 纯数字
      if (/^[a-zA-Z]+$/.test(title)) return '' // 纯英文
      return title
    },

    // 清理要点列表
    cleanBulletPoints(points) {
      if (!points) return []
      return points
        .map(p => {
          // 移除首尾空白
          p = p.trim()
          // 移除开头的编号
          p = p.replace(/^[\d\.\、\．]+/, '')
          p = p.trim()
          // 移除结尾标点
          p = p.replace(/[。；，、:：]$/, '')
          return p
        })
        .filter(p => p.length >= 4) // 过滤太短的
        .filter(p => !/^\d+$/.test(p)) // 过滤纯数字
    },

    // 清理关键句
    cleanKeySentences(sentences) {
      if (!sentences) return []
      return sentences
        .map(s => {
          s = s.trim()
          // 移除结尾标点
          s = s.replace(/[。；，、:：]$/, '')
          return s
        })
        .filter(s => s.length >= 10) // 过滤太短的
        .filter(s => s.length <= 150) // 过滤太长的
    },

    // 生成根标题
    generateRootTitle(chapters, fileName) {
      // 尝试从章节标题推断
      if (chapters.length > 0) {
        const firstChapter = chapters[0].title
        // 如果第一章是"前言"或"摘要"，尝试找第二章
        if (/前言|摘要|概述|简介/.test(firstChapter) && chapters.length > 1) {
          return chapters[1].title.replace(/^第[一二三四五六七八九十百千万]+[章篇部节]\s*/, '').trim()
        }
        // 否则用第一章的标题
        return firstChapter.replace(/^第[一二三四五六七八九十百千万]+[章篇部节]\s*/, '').trim()
      }
      // 从文件名提取
      if (fileName) {
        return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      }
      return '文档总结'
    },

    // 截断文本
    truncateText(text, maxLength) {
      if (!text) return ''
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },

    // 智能章节分组（按字数合并短章节）
    groupChaptersByContent(chapters, fileName) {
      const groups = []
      let currentGroup = []
      let currentLength = 0
      const maxGroupLength = 4000 // 每组最大字数
      const minChapterLength = 800 // 小于此字数的章节考虑合并

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        // 获取章节内容长度（这里用预估长度，实际分析时会获取完整内容）
        const estimatedLength = chapter.chunkCount * 500 || 1000 // 每个chunk约500字

        if (estimatedLength < minChapterLength && currentLength < maxGroupLength) {
          // 短章节，加入当前组
          currentGroup.push(chapter)
          currentLength += estimatedLength
        } else if (currentGroup.length === 0) {
          // 当前组为空，直接加入（即使是长章节）
          currentGroup.push(chapter)
          currentLength += estimatedLength
        } else {
          // 当前组已满或是长章节，保存当前组并新建
          groups.push({
            id: `group_${groups.length}`,
            chapters: currentGroup,
            title: currentGroup.length > 1
              ? `${currentGroup[0].title}等${currentGroup.length}章`
              : currentGroup[0].title,
            totalLength: currentLength
          })
          currentGroup = [chapter]
          currentLength = estimatedLength
        }
      }

      // 保存最后一组
      if (currentGroup.length > 0) {
        groups.push({
          id: `group_${groups.length}`,
          chapters: currentGroup,
          title: currentGroup.length > 1
            ? `${currentGroup[0].title}等${currentGroup.length}章`
            : currentGroup[0].title,
          totalLength: currentLength
        })
      }

      console.log(`📦 章节分组完成: ${chapters.length}章 → ${groups.length}组`)
      groups.forEach((g, i) => {
        console.log(`  组${i + 1}: ${g.title} (${g.chapters.length}章, ${g.totalLength}字)`)
      })

      return groups
    },

    // 阶段1：生成一级章节框架
    async generateChapterFramework(chapters, fileName) {
      return new Promise((resolve, reject) => {
        // 构建章节标题列表
        const chapterList = chapters.map((ch, idx) => `${idx + 1}. ${ch.title}`).join('\n')

        const prompt = `请根据以下文档章节标题，生成一个一级章节的思维导图框架。

要求：
1. **只有一个根节点**：根据文档主题提炼一个合适的中文标题（格式：# 标题）
2. **只生成二级节点**：用 "##" 表示各一级章节的核心主题
3. **忽略英文目录**：有些文档有中英文两个目录，只需分析中文章节
4. **每个二级节点要有实质内容**：简要概括该章节的核心要点，不能只写章节名
5. **不要生成三级及以下节点**：详细内容会在后续步骤补充

【章节标题列表】：
${chapterList}

请直接输出Markdown格式的思维导图框架，不要有任何其他说明文字。
格式示例：
# 文档标题
## 第一章主题
- 核心要点1
- 核心要点2
## 第二章主题
- 核心要点1
- 核心要点2`

        console.log('========================================')
        console.log('📤 阶段1 - 生成框架提示词：')
        console.log('========================================')
        console.log(prompt)
        console.log('========================================')

        let result = ''
        this.aiInstance.request(
          {
            messages: [
              { role: 'system', content: '你是一个专业的文档结构分析专家。请根据章节标题生成清晰的一级框架。' },
              { role: 'user', content: prompt }
            ]
          },
          (chunk) => {
            result = chunk
          },
          (final) => {
            const finalResult = final || result
            console.log('========================================')
            console.log('📥 阶段1 - AI返回的框架：')
            console.log('========================================')
            console.log(finalResult)
            console.log('========================================')
            resolve(finalResult)
          },
          (error) => { reject(error) }
        )
      })
    },

    // 获取章节组的内容
    async getGroupContent(group, fileName) {
      const contents = []
      for (const chapter of group.chapters) {
        try {
          const content = await this.getChapterContent(chapter.id, fileName)
          if (content && content.length > 50) {
            contents.push({
              chapterId: chapter.id,
              chapterTitle: chapter.title,
              content: content
            })
          }
        } catch (e) {
          console.warn(`获取章节 "${chapter.title}" 内容失败:`, e.message)
        }
      }

      // 组装组内容
      if (contents.length === 0) return ''

      let assembledContent = ''
      for (const item of contents) {
        assembledContent += `## ${item.chapterTitle}\n${item.content}\n\n`
      }

      // 限制总长度
      const maxLength = 30000
      if (assembledContent.length > maxLength) {
        // 按比例截断每章
        const ratio = maxLength / assembledContent.length
        assembledContent = ''
        for (const item of contents) {
          const truncatedContent = item.content.slice(0, Math.floor(item.content.length * ratio))
          assembledContent += `## ${item.chapterTitle}\n${truncatedContent}\n\n`
        }
      }

      return assembledContent
    },

    // 阶段2：分析章节组的详细内容
    async analyzeChapterGroup(group, content, index, total) {
      return new Promise((resolve, reject) => {
        const isSingleChapter = group.chapters.length === 1
        const groupDescription = isSingleChapter
          ? `章节"${group.chapters[0].title}"`
          : `${group.chapters.length}个章节（${group.chapters.map(c => c.title).join('、')}）`

        const prompt = `请**严格**根据以下内容，生成${groupDescription}的详细思维导图。

【重要要求】：
1. **只分析当前提供的内容**：严禁引用文档其他章节的内容，只能基于上面【内容】部分提供的文本
2. **内容范围限制**：
   - 只提取与"${group.chapters.map(c => c.title).join('、')}"直接相关的信息
   - 如果内容中包含其他章节的标题，请忽略，不要分析
3. **层级结构**（必须严格遵守）：
   - 第一行：## 主题（使用最相关的章节标题）
   - 第二级：### 子主题（用###表示主要知识点）
   - 第三级：#### 具体细节（用####表示详细内容）
   - 每个层级缩进2个空格
4. **禁止重复**：
   - 不要重复列出相同的要点
   - 不要包含"详见文档"等占位符
   - 每个节点必须有实质内容

【待分析的内容】：
${content.slice(0, 25000)}

请直接输出Markdown格式的思维导图，不要有任何其他说明文字。`

        console.log(`========================================`)
        console.log(`📤 分析组 "${group.title}"（${group.chapters.length}章）：`)
        console.log(`========================================`)

        let result = ''
        this.aiInstance.request(
          {
            messages: [
              { role: 'system', content: '你是一个专业的文档分析专家。你的任务是：1）只分析提供的特定章节内容；2）严禁引用或包含其他章节的信息；3）生成结构清晰的思维导图。' },
              { role: 'user', content: prompt }
            ]
          },
          (chunk) => {
            result = chunk
          },
          (final) => {
            const finalResult = final || result
            console.log(`📥 组 "${group.title}" 分析完成，长度: ${finalResult.length}`)
            resolve(finalResult)
          },
          (error) => { reject(error) }
        )
      })
    },

    // 🎨 流式更新思维导图（增量更新）
    async updateMindMapStreamingly() {
      if (!this.currentFramework) return

      try {
        // 组装当前进度下的完整思维导图
        const currentResult = this.assembleStreamingMindMap()
        this.summaryResult = this.normalizeMarkdown(currentResult)

        // 实时更新到思维导图（如果用户想立即看到）
        if (this.summaryResult && this.mindMap) {
          try {
            const treeData = transformMarkdownTo(this.summaryResult)
            this.mindMap.setData(treeData)
            console.log(`🎨 流式更新完成（已分析 ${this.analyzedChapterGroups.length}/${this.totalGroups} 组）`)
          } catch (e) {
            console.warn('流式更新思维导图失败:', e.message)
          }
        }
      } catch (error) {
        console.error('流式更新失败:', error)
      }
    },

    // 组装流式更新的思维导图
    assembleStreamingMindMap() {
      if (!this.currentFramework) return ''

      const frameworkLines = this.currentFramework.split('\n')
      const rootNode = frameworkLines.find(line => line.startsWith('# '))

      if (!rootNode) return this.currentFramework

      // 重新组装思维导图
      const finalLines = [rootNode]

      for (let i = 1; i < frameworkLines.length; i++) {
        const line = frameworkLines[i]

        // 检测二级节点（章节主题）
        if (line.startsWith('## ')) {
          const chapterTitle = line.replace('## ', '').trim()
          finalLines.push(line)

          // 检查该章节是否已分析（使用智能匹配）
          const matchedGroup = this.findMatchingGroup(chapterTitle)

          if (matchedGroup) {
            // 已分析，添加详细内容
            const structuredContent = this.extractStructuredContent(matchedGroup.detail, chapterTitle)
            finalLines.push(...structuredContent)
          } else {
            // 未分析，添加占位提示
            finalLines.push('  - （正在分析中...）')
          }
        } else if (line.trim()) {
          finalLines.push(line)
        }
      }

      return finalLines.join('\n')
    },

    // 智能匹配章节标题和已分析的组
    findMatchingGroup(chapterTitle) {
      // 清理标题用于比较
      const cleanChapterTitle = chapterTitle
        .replace(/^第[一二三四五六七八九十百千万]+章\s*/, '')
        .replace(/^\d+[\.\s]+/, '')
        .trim()
        .toLowerCase()

      for (const group of this.analyzedChapterGroups) {
        for (const ch of group.chapters) {
          const cleanChTitle = ch.title
            .replace(/^第[一二三四五六七八九十百千万]+章\s*/, '')
            .replace(/^\d+[\.\s]+/, '')
            .trim()
            .toLowerCase()

          // 完全匹配
          if (cleanChapterTitle === cleanChTitle) {
            return group
          }

          // 包含匹配（互相包含）
          if (cleanChapterTitle.includes(cleanChTitle) ||
              cleanChTitle.includes(cleanChapterTitle)) {
            return group
          }

          // 关键词匹配（提取核心关键词进行匹配）
          const chKeywords = this.extractKeywords(cleanChTitle)
          const titleKeywords = this.extractKeywords(cleanChapterTitle)
          const commonKeywords = chKeywords.filter(k => titleKeywords.includes(k))

          // 如果共享超过50%的关键词，认为是同一章节
          if (commonKeywords.length >= Math.min(chKeywords.length, titleKeywords.length) * 0.5 &&
              commonKeywords.length > 0) {
            return group
          }
        }
      }

      return null
    },

    // 提取关键词（用于模糊匹配）
    extractKeywords(text) {
      // 提取中文词汇（2-4个字符的词组）和英文单词
      const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
      const englishWords = text.match(/[a-zA-Z]{3,}/g) || []
      return [...chineseWords, ...englishWords.map(w => w.toLowerCase())]
    },

    // 从AI返回的内容中提取结构化信息
    extractStructuredContent(detailContent, chapterTitle) {
      if (!detailContent) return []

      const lines = detailContent.split('\n')
      const result = []
      let foundRoot = false
      let currentSection = null

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // 跳过根节点（通常是章节标题）
        if (trimmedLine.startsWith('## ')) {
          foundRoot = true
          continue
        }

        if (!foundRoot) continue

        // 三级标题 → 转换为二级缩进的节点
        if (trimmedLine.startsWith('### ')) {
          const content = trimmedLine.replace('### ', '').trim()
          if (content) {
            currentSection = content
            result.push(`  - ${content}`)
          }
        }
        // 四级标题 → 转换为四级缩进的节点
        else if (trimmedLine.startsWith('#### ')) {
          const content = trimmedLine.replace('#### ', '').trim()
          if (content) {
            result.push(`    - ${content}`)
          }
        }
        // 列表项 → 根据上下文确定层级
        else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ')) {
          const content = trimmedLine.replace(/^[-*+]\s+/, '').trim()
          if (content && content.length > 5) { // 过滤太短的项
            // 如果没有三级标题，作为三级节点
            if (!currentSection) {
              result.push(`  - ${content}`)
            } else {
              // 作为四级节点
              result.push(`    - ${content}`)
            }
          }
        }
        // 普通文本行 → 作为当前章节的描述
        else if (trimmedLine.length > 10 && !trimmedLine.startsWith('#')) {
          // 如果有当前章节，作为子项
          if (currentSection) {
            result.push(`    - ${trimmedLine}`)
          } else {
            // 否则作为三级节点
            result.push(`  - ${trimmedLine}`)
          }
        }
      }

      // 去重
      return this.removeDuplicateLines(result)
    },

    // 去除重复行
    removeDuplicateLines(lines) {
      const seen = new Set()
      return lines.filter(line => {
        const normalized = line.replace(/\s+/g, ' ').trim().toLowerCase()
        if (seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
    },

    // 阶段3：组装最终思维导图
    assembleFinalMindMap(framework, chapterDetails) {
      console.log('========================================')
      console.log('🔧 阶段3 - 组装最终思维导图')
      console.log('========================================')

      // 解析框架获取根节点和二级节点
      const frameworkLines = framework.split('\n')
      const rootNode = frameworkLines.find(line => line.startsWith('# '))

      if (!rootNode) {
        console.warn('⚠️ 未找到根节点，使用默认标题')
        return '# 文档总结\n' + framework
      }

      // 构建章节标题到详情的映射
      const detailMap = new Map()
      chapterDetails.forEach(item => {
        // 使用章节标题作为键（清理后的）
        const cleanTitle = item.chapterTitle.replace(/^第[一二三四五六七八九十百千万]+章\s*/, '').trim()
        detailMap.set(cleanTitle, item.detail)
        detailMap.set(item.chapterTitle, item.detail) // 同时保存原始标题
      })

      // 重新组装思维导图
      const finalLines = [rootNode]
      let currentChapterTitle = ''

      for (let i = 1; i < frameworkLines.length; i++) {
        const line = frameworkLines[i]

        // 检测二级节点（章节主题）
        if (line.startsWith('## ')) {
          // 保存当前章节的子节点（如果有的话）
          if (currentChapterTitle && detailMap.has(currentChapterTitle)) {
            // 这部分逻辑在下面处理
          }

          // 提取章节标题
          const chapterTitle = line.replace('## ', '').trim()
          currentChapterTitle = chapterTitle

          // 添加二级节点
          finalLines.push(line)

          // 查找并添加该章节的详细内容
          let detailContent = null
          for (const [key, value] of detailMap) {
            if (chapterTitle.includes(key) || key.includes(chapterTitle)) {
              detailContent = value
              break
            }
          }

          if (detailContent) {
            // 解析详情内容，提取三级及以下节点
            const detailLines = detailContent.split('\n')
            let foundRoot = false

            for (const detailLine of detailLines) {
              // 跳过二级节点（因为框架中已经有了）
              if (detailLine.startsWith('## ')) {
                foundRoot = true
                continue
              }

              // 添加三级及以下节点（缩进2个空格）
              if (foundRoot && detailLine.trim()) {
                if (detailLine.startsWith('### ')) {
                  finalLines.push('  ' + detailLine.replace('### ', '- '))
                } else if (detailLine.startsWith('#### ')) {
                  finalLines.push('    ' + detailLine.replace('#### ', '- '))
                } else if (detailLine.startsWith('- ')) {
                  finalLines.push('  ' + detailLine)
                } else if (detailLine.startsWith('  - ')) {
                  finalLines.push('  ' + detailLine)
                }
              }
            }
          }
        } else if (line.trim()) {
          // 保留框架中的其他内容（如二级节点的要点）
          finalLines.push(line)
        }
      }

      const result = finalLines.join('\n')
      console.log(`✅ 组装完成，最终长度: ${result.length} 字符`)
      console.log('========================================')

      return result
    },



    // 获取单个章节的内容
    async getChapterContent(chapterId, fileName) {
      try {
        const response = await fetch('/api/documents/chapter-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileName,
            maxLength: 100000,
            chapterId: chapterId
          })
        })

        if (response.ok) {
          const data = await response.json()
          return data.content || ''
        }
      } catch (e) {
        console.warn('获取章节内容失败:', e.message)
      }
      return ''
    },

    // 获取文档统计信息（章节结构）
    async getDocumentStats() {
      try {
        // 使用 fileId 或 fileName 从后端获取
        let url = '/api/documents/stats'
        if (this.fileId) {
          url += `?fileId=${encodeURIComponent(this.fileId)}`
        } else if (this.fileName) {
          url += `?fileName=${encodeURIComponent(this.fileName)}`
        } else if (this.currentFile && this.currentFile.name) {
          url += `?fileName=${encodeURIComponent(this.currentFile.name)}`
        } else {
          throw new Error('没有文件信息')
        }

        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          const stats = data.data || {}
          return {
            ...stats,
            fileName: stats.fileName || this.fileName || this.currentFile?.name
          }
        }

        throw new Error('获取文档统计失败')
      } catch (error) {
        console.error('获取文档统计失败:', error)
        return { totalChapters: 0, chapters: [], fileName: this.fileName }
      }
    },

    // 获取章节感知的关键内容
    async getChapterAwareContent() {
      try {
        // 如果是小文件（<8000字符），直接返回全部内容
        if (this.fileContent.length < 8000) {
          return this.fileContent
        }

        // 大文件：调用后端进行章节感知检索
        if (this.currentFile && this.currentFile.name) {
          try {
            const response = await fetch('/api/documents/chapter-content', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fileName: this.currentFile.name,
                chapterId: 'all',
                maxLength: 80000
              })
            })

            if (response.ok) {
              const data = await response.json()
              if (data.content && data.content.length > 1000) {
                console.log('✅ 使用后端章节感知检索结果')
                return data.content
              }
            }
          } catch (e) {
            console.log('后端检索失败，使用前端处理:', e.message)
          }
        }

        // 后备方案：前端智能分段处理
        console.log('📝 使用前端智能分段处理')
        return this.smartContentExtraction(this.fileContent)

      } catch (error) {
        console.error('获取章节内容失败:', error)
        // 出错时返回截断的内容
        return this.fileContent.slice(0, 12000)
      }
    },

    // 前端智能内容提取（大文件分段）- 优化版
    smartContentExtraction(text) {
      const maxLength = 12000

      // 如果内容不长，直接返回
      if (text.length <= maxLength) {
        return text
      }

      // 先检测是否是目录页（目录通常有很多短行，包含"..."和页码）
      const lines = text.split('\n')
      const tocPatterns = /\.\.\.\s*\d+$|^目\s*录|^Contents/i
      let tocLineCount = 0
      for (let i = 0; i < Math.min(100, lines.length); i++) {
        if (tocPatterns.test(lines[i])) tocLineCount++
      }

      // 如果前100行超过30行是目录格式，跳过目录部分
      let startIndex = 0
      if (tocLineCount > 30) {
        // 找到目录结束的位置（通常是"1 总则"或"第1章"开始）
        for (let i = 50; i < lines.length; i++) {
          if (/^第[一二三四五六七八九十]+章|^第\s*\d+\s*章|^1\s+总则|^1\.0\.1/.test(lines[i])) {
            startIndex = i
            console.log('📖 跳过目录，从正文开始:', lines[i])
            break
          }
        }
      }

      // 提取正文内容
      const contentLines = lines.slice(startIndex)
      const chapterPattern = /^第[一二三四五六七八九十百千万]+章.*|^第\s*\d+\s*章.*|^\d+\.\d+\s+.+|^\d+\s+[^.]{2,20}$/m

      // 分段策略：提取每个章节的前800字符（包含定义、要求等实质内容）
      const extractedParts = []
      let currentLength = 0
      let inChapter = false
      let chapterContent = ''
      let lastChapterTitle = ''

      for (let i = 0; i < contentLines.length && currentLength < maxLength; i++) {
        const line = contentLines[i]

        // 检测章节标题
        if (chapterPattern.test(line)) {
          // 保存上一章的内容
          if (chapterContent && lastChapterTitle) {
            extractedParts.push(lastChapterTitle)
            extractedParts.push(chapterContent.slice(0, 800)) // 每章最多800字符
            currentLength += lastChapterTitle.length + Math.min(chapterContent.length, 800)
          }

          lastChapterTitle = line
          chapterContent = ''
          inChapter = true
        } else if (inChapter && line.trim()) {
          // 累计章节内容
          chapterContent += line + '\n'
        }
      }

      // 保存最后一章
      if (chapterContent && lastChapterTitle && currentLength < maxLength) {
        extractedParts.push(lastChapterTitle)
        extractedParts.push(chapterContent.slice(0, 800))
      }

      // 如果没有提取到任何章节，返回前12000字符
      if (extractedParts.length === 0) {
        return text.slice(startIndex, startIndex + maxLength) + '\n\n（文档内容已截断）'
      }

      const result = extractedParts.join('\n\n')
      console.log(`✅ 智能提取完成：${extractedParts.length / 2} 个章节`)
      return result + '\n\n（以上为文档各章节核心内容摘要）'
    },

    // 规范化 Markdown 格式
    normalizeMarkdown(content) {
      if (!content) return content

      // 1. 去除代码块标记
      content = content.replace(/```markdown|```mermaid|```/g, '')

      // 2. 去除 Mermaid 标记
      content = content.replace(/```mermaid[\s\S]*?```/g, '')

      // 3. 去除前后空格和空行
      content = content.trim()

      // 4. 确保有根节点（如果没有 # 开头，添加默认根节点）
      if (!content.startsWith('#')) {
        content = '# 文档总结\n' + content
      }

      // 5. 标准化列表符号：将 * 和 + 统一为 -
      content = content.replace(/^\* /gm, '- ')
      content = content.replace(/^\+ /gm, '- ')

      // 6. 修复纯标题节点（如 "- 1.1 目的" → "- 目的：..."）
      content = this.fixPureTitleNodes(content)

      // 7. 确保子节点有正确的缩进（两个空格）
      content = content.replace(/^ {4}/gm, '  ')
      content = content.replace(/^\t/gm, '  ')

      // 8. 去除多余的空行
      content = content.replace(/\n{3,}/g, '\n\n')

      return content.trim()
    },

    // 修复纯标题节点（检测是否只有章节标题而没有内容）
    fixPureTitleNodes(content) {
      const lines = content.split('\n')
      const fixedLines = []
      let hasPureTitle = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // 检测纯标题模式："- 1.1 xxx" 或 "- 第x章 xxx" 但没有冒号或描述
        const pureTitleMatch = line.match(/^(\s*)- ((?:\d+\.?)+|第[一二三四五六七八九十\d]+章?)\s+(.+)$/)

        if (pureTitleMatch && !line.includes('：') && !line.includes(':') && !line.includes('（')) {
          // 这是纯标题，尝试从下一行提取内容或添加提示
          hasPureTitle = true
          const indent = pureTitleMatch[1]
          const title = pureTitleMatch[3]

          // 查看下一行是否有内容
          const nextLine = lines[i + 1]
          if (nextLine && nextLine.startsWith(indent + '  -') &&
              (nextLine.includes('：') || nextLine.includes(':'))) {
            // 下一行有内容，保留当前行但简化
            fixedLines.push(indent + '- ' + title)
          } else {
            // 没有子内容，添加提示
            fixedLines.push(indent + '- ' + title + '（详见文档）')
          }
        } else {
          fixedLines.push(line)
        }
      }

      if (hasPureTitle) {
        console.warn('⚠️ 检测到纯标题节点，已自动添加提示')
      }

      return fixedLines.join('\n')
    },

    // 生成思维导图
    async generateMindMap() {
      // 结果已经是markdown格式，可以直接使用
      return Promise.resolve()
    },

    // 停止处理（流式模式下保留已分析结果）
    stopProcess() {
      if (this.isStreaming) {
        // 流式模式下，设置停止标志，让循环自然结束
        this.stopRequested = true
        if (this.aiInstance) {
          this.aiInstance.stop()
        }
        this.isProcessing = false
        this.isStreaming = false

        // 显示已分析的进度
        const analyzedCount = this.analyzedChapterGroups.length
        const totalCount = this.totalGroups
        this.$message.success(`已停止分析，已完成 ${analyzedCount}/${totalCount} 组章节`)

        console.log(`⏹️ 用户停止分析，保留已完成的 ${analyzedCount} 组结果`)
      } else {
        // 非流式模式，直接停止
        if (this.aiInstance) {
          this.aiInstance.stop()
        }
        this.isProcessing = false
        this.$message.info(this.$t('ai.stoppedGenerating'))
      }
    },

    // 重新生成
    regenerate() {
      this.summaryResult = ''
      this.startProcess()
    },

    // 确认导入思维导图
    confirmImport() {
      if (!this.summaryResult) return

      this.isImporting = true

      try {
        // 导入前再次确保格式正确
        const normalizedContent = this.normalizeMarkdown(this.summaryResult)
        // 将markdown转换为思维导图数据
        const treeData = transformMarkdownTo(normalizedContent)

        // 设置数据到思维导图
        this.mindMap.setData(treeData)

        this.$message.success(this.$t('ai.importSuccess'))
        this.closeDialog()
      } catch (error) {
        console.error('导入失败:', error)
        this.$message.error(this.$t('ai.importFailed'))
      } finally {
        this.isImporting = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.aiSummaryDialog {
  /deep/ .el-dialog__body {
    padding: 20px;
  }

  .contentBox {
    min-height: 300px;
  }

  .uploadComponent {
    text-align: center;

    .el-upload-dragger {
      width: 100%;
      height: 200px;
    }

    .el-icon-upload {
      font-size: 48px;
      color: #409eff;
      margin-bottom: 16px;
    }

    .el-upload__text {
      font-size: 14px;
      margin-bottom: 8px;
    }

    .el-upload__tip {
      color: #909399;
      font-size: 12px;
    }
  }

  .processingArea {
    padding: 20px;

    .processingStep {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      .stepIcon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #f5f7fa;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        flex-shrink: 0;

        i {
          font-size: 12px;

          &.el-icon-loading {
            color: #409eff;
          }

          &.el-icon-check {
            color: #67c23a;
          }

          &.el-icon-close {
            color: #f56c6c;
          }
        }
      }

      .stepContent {
        flex: 1;

        .stepTitle {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .stepDesc {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .resultArea {
    .resultHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-weight: 500;
    }

    .resultContent {
      max-height: 300px;
      overflow-y: auto;
      background: #f5f7fa;
      padding: 12px;
      border-radius: 4px;

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.6;
      }
    }
  }

  // 卡片样式
  .configCard,
  .uploadCard {
    background: #ffffff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    margin-bottom: 16px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);

    .cardTitle {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: #f5f7fa;
      border-bottom: 1px solid #ebeef5;
      font-size: 14px;
      font-weight: 500;
      color: #303133;

      i {
        margin-right: 8px;
        font-size: 16px;
        color: #409eff;
      }
    }

    .cardContent {
      padding: 16px;
    }
  }

  // 自定义提示词样式（扁平化）
  .customPromptSection {
    margin-bottom: 16px;

    .customPromptHeader {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
      color: #606266;

      span {
        font-weight: 500;
      }

      i.el-icon-question {
        margin-left: 6px;
        color: #909399;
        cursor: help;
        font-size: 14px;
      }
    }

    .customPromptInput {
      .el-textarea__inner {
        font-size: 13px;
        border-radius: 4px;
      }
    }
  }

  // AI配置状态行
  .aiConfigStatus {
    padding-top: 12px;
    border-top: 1px dashed #e4e7ed;

    .configRow {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .configLabel {
        font-size: 13px;
        color: #606266;
      }

      .configBtn {
        margin-left: auto;
      }
    }
  }

  // 上传组件样式优化
  .uploadComponent {
    .el-upload {
      width: 100%;
    }

    .el-upload-dragger {
      width: 100%;
      height: auto;
      min-height: 160px;
      padding: 32px 20px;
      border: 2px dashed #d9d9d9;
      border-radius: 8px;
      background: #fafafa;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
        background: #f0f9ff;
      }

      .uploadInner {
        text-align: center;

        .el-icon-upload {
          font-size: 42px;
          color: #c0c4cc;
          margin-bottom: 12px;
          transition: color 0.3s;
        }

        .uploadMainText {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .uploadSubText {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  // 底部警告提示
  .bottomWarning {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    margin-top: 8px;
    background: #fdf6ec;
    border: 1px solid #faecd8;
    border-radius: 6px;
    font-size: 12px;
    color: #e6a23c;

    i {
      margin-right: 6px;
      font-size: 14px;
    }
  }
}
</style>
