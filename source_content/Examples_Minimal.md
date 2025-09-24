# Minimal Examples: Using BFF Proxy with PAT

## Python (OpenAI SDK)
```python
from openai import OpenAI
import os

os.environ["OPENAI_BASE_URL"] = "https://<bff-host>/proxy/openai/v1"
os.environ["OPENAI_API_KEY"] = "aria_pat_XXXXXXXXXXXXXXXX"

client = OpenAI()
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello from EmpowerNow"}],
    stream=False,
)
print(resp.choices[0].message)
```

## Node (OpenAI SDK)
```bash
export OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
export OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```
```ts
import OpenAI from "openai";
const client = new OpenAI();
const resp = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello from EmpowerNow" }],
});
console.log(resp.choices[0].message);
```
