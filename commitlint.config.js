module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 提交类型枚举（添加个性化图标描述）
    'type-enum': [
      2,
      'always',
      [
        'feat',      // ✨ 新功能 (feature)
        'fix',       // 🐛 修复问题 (bug fix)
        'docs',      // 📚 文档变更 (documentation)
        'style',     // 💄 代码风格 (styling)
        'refactor',  // 🔄 代码重构 (refactoring)
        'perf',      // ⚡ 性能优化 (performance)
        'test',      // 🧪 测试相关 (testing)
        'build',     // 🏗️ 构建相关 (build system)
        'ci',        // 👷 CI配置 (continuous integration)
        'chore',     // 🔧 其他维护 (maintenance)
        'revert',    // ⏪️ 回滚提交 (revert)
        'merge',     // 🔀 分支合并 (merge)
        'hotfix',    // 🚑 紧急修复 (hotfix)
      ],
    ],

    // 提交类型格式
    'type-case': [2, 'always', 'lower'],
    'type-empty': [2, 'never'],

    // 提交主题
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [0], // 不限制大小写，让团队自由选择
    'subject-max-length': [2, 'always', 50], // 限制主题长度

    // 提交头部
    'header-max-length': [2, 'always', 72],
    'header-pattern': [2, 'always', /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|merge|hotfix)(\(.+\))?: .{1,}$/],

    // 范围格式（可选）
    'scope-case': [2, 'always', 'lower'],
    'scope-empty': [0], // 允许空范围

    // 主体和脚注
    'body-leading-blank': [1, 'always'], // 主体前空行
    'footer-leading-blank': [1, 'always'], // 脚注前空行

    // 自定义规则：防止使用某些词汇
    'subject-exclamation-mark': [2, 'never'], // 不允许惊叹号
    'header-case': [0], // 不限制头部大小写
  },

  // 自定义提示信息
  prompt: {
    messages: {
      type: '选择提交类型 (必选):\n',
      scope: '选择修改范围 (可选):\n',
      subject: '简短描述提交内容 (必填):\n',
      body: '详细描述提交内容 (可选):\n',
      breaking: '破坏性变更说明 (可选):\n',
      footer: '关联问题编号 (可选):\n'
    },
    types: {
      feat: {
        description: '✨ 新功能',
        title: 'Features'
      },
      fix: {
        description: '🐛 修复问题',
        title: 'Bug Fixes'
      },
      docs: {
        description: '📚 文档变更',
        title: 'Documentation'
      },
      style: {
        description: '💄 代码风格',
        title: 'Styles'
      },
      refactor: {
        description: '🔄 代码重构',
        title: 'Code Refactoring'
      },
      perf: {
        description: '⚡ 性能优化',
        title: 'Performance'
      },
      test: {
        description: '🧪 测试相关',
        title: 'Tests'
      },
      build: {
        description: '🏗️ 构建相关',
        title: 'Builds'
      },
      ci: {
        description: '👷 CI配置',
        title: 'Continuous Integration'
      },
      chore: {
        description: '🔧 其他维护',
        title: 'Chores'
      },
      revert: {
        description: '⏪️ 回滚提交',
        title: 'Reverts'
      },
      merge: {
        description: '🔀 分支合并',
        title: 'Merges'
      },
      hotfix: {
        description: '🚑 紧急修复',
        title: 'Hotfixes'
      }
    }
  }
};
