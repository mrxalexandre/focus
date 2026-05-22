import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import fsPromises from "fs/promises";

const DB_FILE = path.join(process.cwd(), 'database.json');
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ 
    records: [], 
    users: [{ id: 'admin-1', username: 'admin', name: 'Administrador', role: 'admin' }],
    children: [] 
  }));
}

const SYSTEM_INSTRUCTION = `Você é o motor de inteligência artificial central de um sistema de acompanhamento multidisciplinar para crianças com TDAH. O sistema possui 5 visões de usuários (Psicóloga, Psicopedagoga, Fonoaudióloga, Professora e Pais) e armazena os dados brutos em um banco de dados Google Sheets. Sua função é processar as entradas de texto, validar as métricas escolares, estruturar os dados para os comandos de CRUD e gerar relatórios consolidados e humanizados para os pais.

# SYSTEM ARCHITECTURE & DATA STRUCTURE

## 1. Clínicas (Psicóloga, Psicopedagoga e Fonoaudióloga)
- Formato de entrada: Texto livre descritivo.
- Campos obrigatórios para o Sheets: [Data_Hora, Paciente, Profissional, Especialidade, Resumo_Sessao]
- Seu papel: Identificar se o texto contém informações incoerentes e formatar o texto para uma string limpa que será enviada para a célula do Sheets.

## 2. Escolar (Professora)
A professora preenche um checklist diário por disciplina baseado estritamente na seguinte legenda e tabelas de códigos:

- Disciplinas Aceitas: [Portugues, Matematica, Historia, Ciencias, Ensaio, Educação Física, Pratica textual, Líder em mim, Inglês]
- Tempo de concentração:
  * MC (Muito Curto) | MD (Médio) | DR (Dentro do Registo/Esperado) | NC (Não Concentrou)
- Foco:
  * R (Reduzido) | MT (Mantido com Esforço) | AD (Adequado) | DP (Disperso)
- Tempo de espera:
  * AT (Atendeu) | AL (Alta Limitação) | DI (Dificuldade Intensa)
- Organização do aluno:
  * M (Mau) | OL (Organizado com Lembrete) | NF (Não Focado) | AG (Adequado ao Grupo)
- Conclusão da atividade:
  * C (Concluída) | CP (Concluída Parcialmente) | NA (Não Apresentou) | NC (Não Concluiu)
- Humor:
  * MH (Muito Bom) | AO (Agitado/Ansioso) | DA (Desatento) | AI (Alterado/Irritado)
- Observação: Texto livre opcional.

Seu papel: Validar se os códigos enviados pela professora pertencem estritamente a esta legenda. Se houver códigos errados, aponte o erro antes de salvar.

## 3. Familiar (Visão dos Pais)
- Papel da IA: Os pais podem enviar mensagens para cada profissional de modo individual sobre a atividade referida, apenas leem. Você deve atuar como um tradutor clínico/pedagógico. Quando solicitado um "Relatório para os Pais", você lerá as siglas da professora e os resumos textuais das clínicas de um determinado período e gerará um resumo unificado, acolhedor, livre de siglas técnicas complicadas, focando na evolução e nos pontos de atenção da criança.

# OPERATIONAL COMMANDS (CRUD INTERFACE)
Você deve responder estruturando a saída com base na intenção do usuário do sistema. Identifique a intenção do input e responda no formato JSON correspondente para que o back-end execute o CRUD no Google Sheets:

1. INTENÇÃO: SALVAR_CLINICA
   Input esperado: Relato da sessão + identificação da especialista.
   Output da IA: JSON estruturado com os campos da planilha. Se faltarem informações essenciais (como o nome do aluno), retorne um JSON de erro informando o que falta em um campo "error". Senão, retorne o formato {"data": {"Data_Hora": "...", "Paciente": "...", "Profissional": "...", "Especialidade": "...", "Resumo_Sessao": "..."}}.

2. INTENÇÃO: SALVAR_ESCOLA
   Input esperado: Dados do checklist da professora.
   Output da IA: Validação dos códigos e geração do JSON estruturado por disciplina. Retorne o formato {"data": [{ "Disciplina": "...", "Codigos": { ... } }], "historico": "..." } ou {"error": "..."} se códigos forem inválidos.

3. INTENÇÃO: RELATORIO_PAIS
   Input esperado: Dados brutos extraídos do Sheets (textos das clínicas e siglas da escola).
   Output da IA: Texto corrido, humanizado, empático, traduzindo as siglas e resumindo a semana/mês da criança para os pais. Retorne o formato {"report": "..."}.

# GUIDELINES & RESTRICTIONS
- Nunca invente dados clínicos ou pedagógicos que não foram explicitamente informados.
- Caso falte alguma informação crucial para o salvamento (como o nome do aluno ou a data), peça a informação (usando o campo "error" no JSON) antes de processar o JSON.
- Ao gerar o relatório dos pais, mantenha um tom de voz empático, focado no desenvolvimento e suporte à criança, sem jargões excessivamente burocráticos.
- RESPONDA **SEMPRE** EM UM FORMATO JSON VÁLIDO e puro. SEM formatação markdown (\`\`\`json). Apenas o JSON cru iniciado por '{' ou '['.`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/records", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      
      const childId = req.query.childId as string;
      if (childId) {
        res.json(db.records.filter((r: any) => r.childId === childId));
      } else {
        res.json(db.records);
      }
    } catch (err) {
      res.status(500).json({ error: "Error reading database" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      res.json(db.users || []);
    } catch (err) {
      res.status(500).json({ error: "Error reading users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      db.users = req.body;
      await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
      res.json(db.users);
    } catch (err) {
      res.status(500).json({ error: "Error saving users" });
    }
  });

  app.get("/api/children", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      res.json(db.children || []);
    } catch (err) {
      res.status(500).json({ error: "Error reading children" });
    }
  });

  app.post("/api/children", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      db.children = req.body;
      await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
      res.json(db.children);
    } catch (err) {
      res.status(500).json({ error: "Error saving children" });
    }
  });

  app.post("/api/sync-sheets", async (req, res) => {
    try {
      const gAccessToken = req.headers.authorization;
      if (!gAccessToken) return res.status(401).json({ error: "Missing authorization" });

      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);

      if (!db.settings?.spreadsheetId) return res.json({ success: true, message: "No spreadsheet configured" });

      const unsyncedRecords = (db.records || []).filter((r: any) => !r.syncedToSheets);
      if (unsyncedRecords.length === 0) return res.json({ success: true, synced: 0 });

      const rows = unsyncedRecords.map((r: any) => [
          new Date(r.date).toLocaleString('pt-BR'),
          r.childName || '',
          r.userName || '',
          r.type === 'SALVAR_CLINICA' ? 'Clínica' : 'Escola',
          JSON.stringify(r.data || {})
      ]);

      const range = 'Página1';
      const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${db.settings.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: {
            'Authorization': gAccessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: rows })
      });
      const sheetData = await sheetRes.json();

      if (sheetData.error) {
          console.error("Sheets sync error:", sheetData.error);
          return res.status(500).json({ error: sheetData.error.message });
      }

      // Mark as synced
      db.records = db.records.map((r: any) => {
         if (!r.syncedToSheets) {
            return { ...r, syncedToSheets: true };
         }
         return r;
      });
      await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));

      res.json({ success: true, synced: rows.length });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      res.json(db.settings || {});
    } catch (err) {
      res.status(500).json({ error: "Error reading settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      db.settings = { ...db.settings, ...req.body };
      await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
      res.json(db.settings);
    } catch (err) {
      res.status(500).json({ error: "Error saving settings" });
    }
  });

  app.delete("/api/records/:id", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      db.records = db.records.filter((r: any) => r.id !== req.params.id);
      await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error deleting record" });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
      const db = JSON.parse(dbData);
      
      const childId = req.query.childId as string;
      let records = db.records;
      if (childId) {
          records = records.filter((r: any) => r.childId === childId);
      }
      
      const lines = ["ID,Data,Crianca,Tipo,Dados"];
      records.forEach((r: any) => {
          let dados = JSON.stringify(r.data || {}).replace(/"/g, '""');
          lines.push(`"${r.id}","${new Date(r.date).toLocaleString('pt-BR')}","${r.childName || ''}","${r.type === 'SALVAR_CLINICA' ? 'Clínica' : 'Escola'}","${dados}"`);
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="planilha_registros.csv"`);
      res.send(lines.join('\n'));
    } catch (err) {
      res.status(500).json({ error: "Error Exporting database" });
    }
  });

  app.post("/api/engine", async (req, res) => {
    try {
      const { intent, inputData, childId, childName, userId, userName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const prompt = `INTENÇÃO: ${intent}\n\nINPUT ESPERADO:\n${inputData}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json"
        }
      });

      let text = response.text || "{}";
      
      // Clean up potential markdown blocks if present
      text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, '$1').trim();
      if (!text.startsWith('{') && !text.startsWith('[')) {
          // Attempt to find the first '{' or '[' if there is garbage text
          const startIdx = Math.min(
              text.indexOf('{') > -1 ? text.indexOf('{') : Infinity,
              text.indexOf('[') > -1 ? text.indexOf('[') : Infinity
          );
          if (startIdx !== Infinity) {
              const lastBrace = text.lastIndexOf('}');
              const lastBracket = text.lastIndexOf(']');
              const endIdx = Math.max(lastBrace, lastBracket);
              if (endIdx > startIdx) {
                  text = text.substring(startIdx, endIdx + 1);
              }
          }
      }
      
      let parsedText;
      try {
        parsedText = JSON.parse(text);
      } catch (parseError: any) {
        console.error("Failed to parse JSON from AI response:", text, parseError);
        return res.status(500).json({ error: "A inteligência artificial retornou um formato inválido. Tente novamente." });
      }

      if (!parsedText.error && (intent === 'SALVAR_CLINICA' || intent === 'SALVAR_ESCOLA')) {
        try {
          const dbData = await fsPromises.readFile(DB_FILE, 'utf-8');
          const db = JSON.parse(dbData);
          
          const newRecord = {
            id: Date.now().toString(),
            childId,
            childName,
            userId,
            userName,
            type: intent,
            data: parsedText.data,
            date: new Date().toISOString(),
            syncedToSheets: false
          };
          
          db.records.push(newRecord);
          await fsPromises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
        } catch (dbErr) {
          console.error("Failed to save to mock DB", dbErr);
        }
      }

      res.json(parsedText);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
