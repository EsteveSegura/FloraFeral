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
    },

    updateNodePosition(nodeId, position) {
      const node = this.nodes.find(node => node.id === nodeId)
      if (node) {
        node.position = position
      }
    },

    initMockNodes() {
      // Nodos de ejemplo para pruebas
      this.nodes = [
        {
          id: 'node-1',
          type: 'image',
          position: { x: 100, y: 100 },
          data: { label: 'Imagen 1' }
        },
        {
          id: 'node-2',
          type: 'generator',
          position: { x: 400, y: 100 },
          data: { label: 'Generador 1', prompt: '' }
        },
        {
          id: 'node-3',
          type: 'generator',
          position: { x: 250, y: 300 },
          data: { label: 'Generador 2', prompt: '' }
        }
      ]

      // Edge de ejemplo
      this.edges = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2'
        }
      ]
    }
  }
})
