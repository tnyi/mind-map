<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <div class="toolbar" ref="toolbarRef">
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>
      <!-- 导出 -->
      <div class="toolbarBlock">
        <div class="toolbarBtn" @click="showHistoryFiles" v-if="!isMobile">
          <span class="icon iconfont iconzuijinliulan"></span>
          <span class="text">{{ $t('toolbar.historyFiles') }}</span>
        </div>

        <el-tooltip
          effect="dark"
          :content="$t('toolbar.newFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" @click="createNewLocalFile">
            <span class="icon iconfont iconxinjian"></span>
            <span class="text">{{ $t('toolbar.newFile') }}</span>
          </div>
        </el-tooltip>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.openFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" @click="openLocalFile">
            <span class="icon iconfont iconwenjian1"></span>
            <span class="text">{{ $t('toolbar.openFile') }}</span>
          </div>
        </el-tooltip>
        <div class="toolbarBtn" @click="renameCurrentFile" v-if="!isMobile && currentFileId">
          <span class="icon iconfont iconlingcunwei"></span>
          <span class="text">{{ $t('toolbar.rename') }}</span>
        </div>
        <div class="toolbarBtn" @click="$bus.$emit('showImport')">
          <span class="icon iconfont icondaoru"></span>
          <span class="text">{{ $t('toolbar.import') }}</span>
        </div>
        <div
          class="toolbarBtn"
          @click="$bus.$emit('showExport')"
        >
          <span class="icon iconfont iconexport"></span>
          <span class="text">{{ $t('toolbar.export') }}</span>
        </div>
        <!-- 本地文件树 -->
        <div
          class="fileTreeBox"
          v-if="fileTreeVisible"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? '/' + rootDirName : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              ></div>
              <div
                class="btn el-icon-close"
                @click="fileTreeVisible = false"
              ></div>
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <span class="customTreeNode" slot-scope="{ node, data }">
                <div class="treeNodeInfo">
                  <span
                    class="treeNodeIcon iconfont"
                    :class="[
                      data.type === 'file' ? 'iconwenjian' : 'icondakai'
                    ]"
                  ></span>
                  <span class="treeNodeName">{{ node.label }}</span>
                </div>
                <div class="treeNodeBtnList" v-if="data.type === 'file'">
                  <el-button
                    type="text"
                    size="mini"
                    v-if="data.enableEdit"
                    @click="editLocalFile(data)"
                    >编辑</el-button
                  >
                  <el-button
                    type="text"
                    size="mini"
                    v-else
                    @click="importLocalFile(data)"
                    >导入</el-button
                  >
                </div>
              </span>
            </el-tree>
          </div>
        </div>
      </div>
    </div>
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
    <!-- 历史文件弹窗 -->
    <el-dialog
      :title="$t('toolbar.historyFiles')"
      :visible.sync="historyFilesVisible"
      width="700px"
      :close-on-click-modal="true"
    >
      <div class="historyFilesList" v-if="historyFiles.length > 0">
        <div
          v-for="file in historyFiles"
          :key="file.id"
          class="historyFileItem"
          @click="openHistoryFile(file)"
        >
          <div class="fileInfo">
            <span class="fileName">{{ file.file_name }}</span>
            <span class="filePath">{{ file.file_path }}</span>
          </div>
          <div class="fileMeta">
            <span class="fileTime">{{ formatTime(file.updated_at) }}</span>
            <i class="el-icon-close deleteBtn" @click.stop="deleteHistoryFile(file.id)"></i>
          </div>
        </div>
      </div>
      <div v-else class="emptyHistory">
        {{ $t('toolbar.noHistoryFiles') }}
      </div>
    </el-dialog>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'

// 工具栏
let fileHandle = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'ai'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    return {
      isMobile: isMobile(),
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      // 历史文件相关
      historyFilesVisible: false,
      historyFiles: []
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi,
      currentFileId: state => state.currentFileId
    }),

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
  },
  mounted() {
    this.computeToolbarShow()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
  },
  methods: {
    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      const windowWidth = window.innerWidth - 40
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    // @param content - 要写入的内容
    // @param isManualSave - 是否是用户主动保存，默认为 true
    onWriteLocalFile(content, isManualSave = true) {
      clearTimeout(this.timer)
      // 只有在用户主动保存时才设置 waitingWriteToLocalFile 为 true
      // 程序自动保存（如打开文件后的初始化）不设置
      if (fileHandle && this.isHandleLocalFile && isManualSave) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        console.log(error)
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
        console.log(error)
      }
    },

    // 打开本地文件
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 读取本地文件
    async readFile() {
      let file = await fileHandle.getFile()
      let fileReader = new FileReader()
      fileReader.onload = async () => {
        this.$store.commit('setIsHandleLocalFile', true)
        this.setData(fileReader.result)
        Notification.closeAll()
        Notification({
          title: this.$t('toolbar.tip'),
          message: `${this.$t('toolbar.editingLocalFileTipFront')}${
            file.name
          }${this.$t('toolbar.editingLocalFileTipEnd')}`,
          duration: 0,
          showClose: true
        })
      }
      fileReader.readAsText(file)
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
      // 记录到历史文件
      if (fileHandle) {
        try {
          const file = await fileHandle.getFile()
          // 使用文件路径或名称作为标识
          const filePath = file.name
          await this.recordFileToHistory(filePath)
        } catch (error) {
          console.error('记录历史文件失败:', error)
        }
      }
    },

    // 创建新文件（服务端）
    async createNewLocalFile() {
      // 检查当前是否有脑图数据
      let hasData = false
      try {
        const data = getData()
        hasData = data && data.root && data.root.data && data.root.data.text
      } catch (e) {
        hasData = false
      }

      // 如果当前有脑图数据，弹出确认对话框
      if (hasData) {
        const h = this.$createElement
        const message = h('div', [
          h('p', this.$t('toolbar.newFileConfirmMessage'))
        ])
        
        try {
          await this.$confirm(
            message,
            this.$t('toolbar.newFileConfirmTitle'),
            {
              confirmButtonText: this.$t('toolbar.saveAndNew'),
              cancelButtonText: this.$t('toolbar.discardAndNew'),
              distinguishCancelAndClose: true,
              type: 'warning'
            }
          )
          // 用户点击"保存并新建" - 先保存当前文件
          await this.saveCurrentFile()
          // 然后创建新文件
          await this.createServerFile()
          return
        } catch (action) {
          // 用户点击"不保存新建"或关闭按钮 - 直接创建新文件
          await this.createServerFile()
          return
        }
      }
      // 没有脑图数据时创建新文件
      await this.createServerFile()
    },

    // 在服务端创建新文件
    async createServerFile() {
      try {
        const response = await fetch('/files/create', { method: 'POST' })
        const data = await response.json()
        const { file_id, file_name } = data
        
        // 设置当前文件ID
        this.$store.commit('setCurrentFileId', file_id)
        this.$store.commit('setIsHandleLocalFile', false)
        
        // 加载空白画布
        const newData = {
          root: {
            data: {
              text: '中心主题',
              richText: false,
              expand: true
            },
            children: []
          },
          layout: 'logicalStructure',
          theme: 'default'
        }
        this.$bus.$emit('setData', newData)
        
        this.$message.success(`已创建新文件: ${file_name}`)
      } catch (error) {
        console.error('创建文件失败:', error)
        this.$message.error('创建文件失败')
      }
    },

    // 保存当前文件到服务端
    async saveCurrentFile() {
      if (!this.currentFileId) {
        return
      }
      
      try {
        const content = getData()
        await fetch(`/files/${this.currentFileId}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
      } catch (error) {
        console.error('保存文件失败:', error)
      }
    },

    // 重置画布
    resetCanvas() {
      // 重置为空白脑图数据
      const newData = JSON.parse(JSON.stringify(exampleData))
      this.$bus.$emit('setData', newData)
      this.$store.commit('setIsHandleLocalFile', false)
      this.$store.commit('setCurrentFileId', null)
    },

    // 判断是否是自动生成的文件名
    isDefaultFileName(name) {
      return /^未命名思维导图_\d{8}_\d{6}$/.test(name)
    },

    // 重命名当前文件
    async renameCurrentFile() {
      if (!this.currentFileId) {
        this.$message.warning('请先创建或打开一个文件')
        return
      }

      try {
        // 获取当前文件名
        const fileInfo = this.historyFiles.find(f => f.id === this.currentFileId)
        const currentName = fileInfo ? fileInfo.file_name : ''
        
        const { value: newName } = await this.$prompt(
          this.isDefaultFileName(currentName) ? '请输入文件名称' : '修改文件名称',
          '重命名',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputValue: currentName,
            inputValidator: (val) => {
              if (!val || !val.trim()) {
                return '文件名不能为空'
              }
              return true
            }
          }
        )

        if (newName && newName.trim()) {
          await fetch(`/files/${this.currentFileId}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_name: newName.trim() })
          })
          
          // 刷新历史文件列表
          await this.loadHistoryFiles()
          
          this.$message.success('重命名成功')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('重命名失败:', error)
          this.$message.error('重命名失败')
        }
      }
    },

    // 打开本地文件（保留功能，用于打开本地.smm文件）
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.readFile()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    },

    // 显示历史文件列表
    async showHistoryFiles() {
      await this.loadHistoryFiles()
      this.historyFilesVisible = true
    },

    // 从后端加载历史文件列表
    async loadHistoryFiles() {
      try {
        const response = await fetch('/files/list?limit=50')
        const data = await response.json()
        this.historyFiles = data.files || []
      } catch (error) {
        console.error('加载历史文件失败:', error)
        this.$message.error('加载历史文件失败')
      }
    },

    // 打开历史文件
    async openHistoryFile(file) {
      try {
        // 获取文件内容
        const response = await fetch(`/files/${file.id}/content`)
        const data = await response.json()
        const { content, file_name } = data
        
        // 设置当前文件ID
        this.$store.commit('setCurrentFileId', file.id)
        this.$store.commit('setIsHandleLocalFile', false)
        
        // 关闭弹窗
        this.historyFilesVisible = false
        
        // 加载文件内容到画布
        this.$bus.$emit('setData', content)
        
        // 提示用户
        this.$message.success(`已打开: ${file_name}`)
      } catch (error) {
        console.error('打开文件失败:', error)
        this.$message.error('打开文件失败')
      }
    },

    // 删除历史记录
    async deleteHistoryFile(fileId) {
      try {
        await fetch(`/files/${fileId}`, { method: 'DELETE' })
        // 从列表中移除
        this.historyFiles = this.historyFiles.filter(f => f.id !== fileId)
        
        // 如果删除的是当前打开的文件，清空画布
        if (this.currentFileId === fileId) {
          this.$store.commit('setCurrentFileId', null)
          this.resetCanvas()
        }
        
        this.$message.success('删除成功')
      } catch (error) {
        console.error('删除历史记录失败:', error)
        this.$message.error('删除失败')
      }
    },

    // 格式化时间
    formatTime(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style lang="less" scoped>
.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
        .icon {
          background: transparent;
          border-color: transparent;
        }

        &:hover {
          &:not(.disabled) {
            .icon {
              background: hsla(0, 0%, 100%, 0.05);
            }
          }
        }

        &.disabled {
          color: #54595f;
        }
      }
    }
  }
  .toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
        }
      }
    }

    .toolbarBtn {
      display: flex;
      justify-content: center;
      flex-direction: column;
      cursor: pointer;
      margin-right: 20px;

      &:last-of-type {
        margin-right: 0;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: #f5f5f5;
          }
        }
      }

      &.active {
        .icon {
          background: #f5f5f5;
        }
      }

      &.disabled {
        color: #bcbcbc;
        cursor: not-allowed;
        pointer-events: none;
      }

      .icon {
        display: flex;
        height: 26px;
        background: #fff;
        border-radius: 4px;
        border: 1px solid #e9e9e9;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        padding: 0 5px;
      }

      .text {
        margin-top: 3px;
      }
    }
  }
}

// 历史文件弹窗样式
.historyFilesList {
  max-height: 400px;
  overflow-y: auto;

  .historyFileItem {
    padding: 12px;
    border-bottom: 1px solid #e9e9e9;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f7fa;
    }

    .fileInfo {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      margin-right: 12px;

      .fileName {
        font-weight: bold;
        color: #333;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .filePath {
        color: #666;
        font-size: 12px;
        word-break: break-all;
        line-height: 1.4;
      }
    }

    .fileMeta {
      display: flex;
      align-items: center;
      flex-shrink: 0;

      .fileTime {
        color: #999;
        font-size: 12px;
        margin-right: 12px;
      }

      .deleteBtn {
        color: #999;
        font-size: 14px;
        cursor: pointer;
        padding: 4px;

        &:hover {
          color: #f56c6c;
        }
      }
    }
  }
}

.emptyHistory {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

// 暗黑模式样式
.toolbarContainer.isDark {
  .historyFilesList {
    .historyFileItem {
      border-bottom-color: #3a3a3a;

      &:hover {
        background-color: #2a2a2a;
      }

      .fileInfo {
        .fileName {
          color: #e0e0e0;
        }

        .filePath {
          color: #999;
        }
      }

      .fileMeta {
        .fileTime {
          color: #666;
        }

        .deleteBtn {
          color: #666;

          &:hover {
            color: #f56c6c;
          }
        }
      }
    }
  }

  .emptyHistory {
    color: #666;
  }
}
</style>
