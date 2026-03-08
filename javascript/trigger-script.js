async function loadScript() {
  return await fetch('/testTriggerScript.txt').then(res => res.text())
}

function getCondition(tokens, lineNumber) {
  const ifIdx = tokens.findIndex(f => f === 'IF')
  const thenIdx = tokens.findIndex(f => f === 'THEN')
  if (ifIdx === -1 || thenIdx === -1) {
    throw new Error(`Invalid if statement at line ${lineNumber}`)
  }
  const condition = []
  for (let i = ifIdx + 1; i < thenIdx; i++) {
    condition.push(tokens[i])
  }
  if (condition.length < 1) {
    throw new Error(`Invalid if statement at line ${lineNumber}`)
  }
  return condition
}

export async function readTriggerScript(script) {
  script = await loadScript()
  const lines = script.split(/\r?\n/)

  const execute = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    let tokens = line.split(/\s+/)
    tokens = tokens.map(f => f = f.toUpperCase())
    const command = tokens[0]

    let step
    switch (command) {
      case 'TELEPORT':
        const destX = parseInt(tokens[1], 10)
        const destY = parseInt(tokens[2], 10)
        const instant = tokens.includes('INSTANT')

        step = { type: "teleport", x: destX, y: destY, instant: instant }
        execute.push(step)
        break;
      case 'DELAY':
        const ms = parseInt(tokens[1], 10)

        step = { type: 'delay', ms: ms }
        execute.push(step)
        break
      case 'CHANGE':
        const changeX = parseInt(tokens[1], 10)
        const changeY = parseInt(tokens[2], 10)

        const blockIdx = tokens.findIndex(f => f === "BLOCK")
        const rotateIdx = tokens.findIndex(f => f === "ROTATE")
        const rotationIdx = tokens.findIndex(f => f === "ROTATION")

        step = { type: "change", x: changeX, y: changeY }
        if (blockIdx !== -1) {
          step.block = parseInt(tokens[blockIdx + 1], 10)
        }
        if (rotateIdx !== -1) {
          step.rotate = parseInt(tokens[rotateIdx + 1], 10)
        } else if (rotationIdx !== -1) {
          step.rotation = parseInt(tokens[rotationIdx + 1], 10)
        }
        if (step.block || step.rotate || step.rotation) execute.push(step)
        break
      case 'IF':
        const condition = getCondition(tokens, i)

        step = { type: "if", condition: {} }

        if (condition[0] == "BLOCK") {
          step.condition.subject = "BLOCK"
          step.condition.x = parseInt(condition[1], 10)
          step.condition.y = parseInt(condition[2], 10)
        } else {
          throw new Error(`Syntax Error on line ${i}`)
        }

        // update this to include more operators later
        const operatorIndex = condition.findIndex(f => f === "IS")
        if (operatorIndex === -1) {
          throw new Error(`Syntax Error on line ${i}`)
          return
        }

        step.condition.operator = condition[operatorIndex]
        step.condition.property = condition[operatorIndex + 1]
        step.condition.value = step.condition.subject === "TYPE" ? condition[operatorIndex + 2] : parseInt(condition[operatorIndex + 2], 10)
        break
      case 'ELSE':
        break
      case 'END':
        step = { type: 'end' }
        execute.push(step)
        break
      default:
        throw new Error(`Unknown Command "${command}" at line ${i + 1}`)
    }
    i++
  }
  console.log(execute)
  return execute
}