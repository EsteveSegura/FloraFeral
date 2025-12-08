import { defineStore } from 'pinia'
import { createNode, createEdge, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import replicateService from '@/services/replicate'

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
      const nodeIndex = this.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        // Replace the entire node object to trigger reactivity
        this.nodes[nodeIndex] = {
          ...this.nodes[nodeIndex],
          data: { ...this.nodes[nodeIndex].data, ...data }
        }
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
      const nodeIndex = this.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        // Replace the entire node object to trigger reactivity
        this.nodes[nodeIndex] = {
          ...this.nodes[nodeIndex],
          position
        }
      }
    },

    initMockNodes() {
      // Mock nodes for testing
      this.nodes = [
        createNode(
          'node-1',
          NODE_TYPES.IMAGE,
          { x: 100, y: 100 },
          { label: 'Image 1' },
          getNodeIOConfig(NODE_TYPES.IMAGE)
        ),
        createNode(
          'node-2',
          NODE_TYPES.IMAGE_GENERATOR,
          { x: 400, y: 100 },
          {
            label: 'Generator 1',
            prompt: '',
            model: 'nano-banana-pro',
            params: replicateService.getModelDefaults('nano-banana-pro')
          },
          getNodeIOConfig(NODE_TYPES.IMAGE_GENERATOR)
        ),
        createNode(
          'node-3',
          NODE_TYPES.IMAGE_GENERATOR,
          { x: 250, y: 300 },
          {
            label: 'Generator 2',
            prompt: '',
            model: 'nano-banana-pro',
            params: replicateService.getModelDefaults('nano-banana-pro')
          },
          getNodeIOConfig(NODE_TYPES.IMAGE_GENERATOR)
        )
      ]

      // Mock edge
      this.edges = [
        createEdge('edge-1', 'node-1', 'node-2')
      ]
    }
  }
})
