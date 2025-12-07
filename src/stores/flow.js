import { defineStore } from 'pinia'

export const useFlowStore = defineStore('flow', {
  state: () => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    getNodeById: (state) => (nodeId) => {
      return state.nodes.find(node => node.id === nodeId)
    },

    getNodeData: (state) => (nodeId) => {
      const node = state.nodes.find(node => node.id === nodeId)
      return node ? node.data : null
    },

    getNodeConnections: (state) => (nodeId) => {
      return {
        incoming: state.edges.filter(edge => edge.target === nodeId),
        outgoing: state.edges.filter(edge => edge.source === nodeId)
      }
    }
  },

  actions: {
    addNode(node) {
      this.nodes.push(node)
    },

    updateNodeData(nodeId, data) {
      const node = this.nodes.find(node => node.id === nodeId)
      if (node) {
        node.data = { ...node.data, ...data }
      }
    },

    removeNode(nodeId) {
      this.nodes = this.nodes.filter(node => node.id !== nodeId)
      this.edges = this.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      )
      if (this.selectedNodeId === nodeId) {
        this.selectedNodeId = null
      }
    },

    addEdge(edge) {
      this.edges.push(edge)
    },

    removeEdge(edgeId) {
      this.edges = this.edges.filter(edge => edge.id !== edgeId)
    },

    setLoading(isLoading) {
      this.isLoading = isLoading
    },

    setError(error) {
      this.error = error
    },

    setSelectedNode(nodeId) {
      this.selectedNodeId = nodeId
    },

    clearError() {
      this.error = null
    }
  }
})
