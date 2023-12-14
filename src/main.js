import './style/style.css'

async function prepareAdapter() {
  if (!navigator.gpu) {
    return console.error("This browser don't support WebGPU.")
  }

  const adapter = await navigator.gpu.requestAdapter()

  if (!adapter) {
    return console.error('No appropriate GPUAdapter found.')
  }

  return adapter
}

async function init() {
  const adapter = await prepareAdapter()

  const device = await adapter.requestDevice()
  const encoder = device.createCommandEncoder()
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  const canvas = document.getElementById('board')
  const context = canvas.getContext('webgpu')

  context.configure({ device: device, format: canvasFormat })

  const vertices = new Float32Array([
    -0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
  ])

  const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })

  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices)

  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        format: 'float32x2',
        offset: 0,
        shaderLocation: 0, // Position, see vertex shader
      },
    ],
  }

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: `
      // Your shader code will go here
      @vertex
      fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4f {
        return vec4f(pos, 0, 1); // (X, Y, Z, W)
      }

      @fragment
      fn fragmentMain() -> @location(0) vec4f {
        return vec4f(0.79, 0.65, 0.96, 1); // (R, G, B, A)
      }
    `,
  })

  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [
        {
          format: canvasFormat,
        },
      ],
    },
  })

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0.11, g: 0.11, b: 0.18, a: 1 },
        storeOp: 'store',
      },
    ],
  })

  pass.setPipeline(cellPipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.draw(vertices.length / 2) // 6 vertices

  pass.end()
  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])

  console.log(canvas)
}

init()
