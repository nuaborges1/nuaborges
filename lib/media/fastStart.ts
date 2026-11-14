/**
 * Reorganiza os átomos de um arquivo MP4 colocando o átomo 'moov' (índice e metadados)
 * antes do átomo 'mdat' (dados de áudio/vídeo).
 *
 * Transforma arquivos brutos de câmera/iPhone em MP4 Web-Streaming FastStart,
 * permitindo reprodução instantânea no navegador sem esperar download completo,
 * com 0% de perda de qualidade (processo binário puro, sem re-encode).
 */
export async function optimizeMp4FastStart(file: File): Promise<{
  blob: Blob;
  wasRelocated: boolean;
}> {
  try {
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);
    const fileLength = buffer.byteLength;

    let offset = 0;
    let ftypBox: { start: number; length: number } | null = null;
    let moovBox: { start: number; length: number } | null = null;
    let mdatBox: { start: number; length: number } | null = null;

    while (offset < fileLength - 8) {
      let boxLength = dataView.getUint32(offset, false);
      const boxType = String.fromCharCode(
        dataView.getUint8(offset + 4),
        dataView.getUint8(offset + 5),
        dataView.getUint8(offset + 6),
        dataView.getUint8(offset + 7)
      );

      if (boxLength === 1) {
        // Box estendido de 64 bits
        if (offset + 16 > fileLength) break;
        const high = dataView.getUint32(offset + 8, false);
        const low = dataView.getUint32(offset + 12, false);
        boxLength = high * 4294967296 + low;
      } else if (boxLength === 0) {
        // Box até o final do arquivo
        boxLength = fileLength - offset;
      }

      if (boxLength < 8 || offset + boxLength > fileLength) {
        break;
      }

      if (boxType === 'ftyp') {
        ftypBox = { start: offset, length: boxLength };
      } else if (boxType === 'moov') {
        moovBox = { start: offset, length: boxLength };
      } else if (boxType === 'mdat') {
        mdatBox = { start: offset, length: boxLength };
      }

      offset += boxLength;
    }

    // Se moov já está antes do mdat, o arquivo já é FastStart!
    if (!moovBox || !mdatBox || moovBox.start < mdatBox.start || !ftypBox) {
      return { blob: file, wasRelocated: false };
    }

    // moov está depois do mdat: precisa de relocalização
    const moovBuffer = buffer.slice(moovBox.start, moovBox.start + moovBox.length);
    const moovView = new DataView(moovBuffer);
    const moovShift = moovBox.length;

    // Atualiza as tabelas de chunk offsets ('stco' e 'co64') dentro do moov
    const updateChunkOffsets = (view: DataView) => {
      const len = view.byteLength;
      for (let i = 0; i < len - 8; i++) {
        const type = String.fromCharCode(
          view.getUint8(i + 4),
          view.getUint8(i + 5),
          view.getUint8(i + 6),
          view.getUint8(i + 7)
        );

        if (type === 'stco') {
          const entryCount = view.getUint32(i + 12, false);
          let entryOffset = i + 16;
          for (let j = 0; j < entryCount; j++) {
            if (entryOffset + 4 > len) break;
            const currentOffset = view.getUint32(entryOffset, false);
            view.setUint32(entryOffset, currentOffset + moovShift, false);
            entryOffset += 4;
          }
        } else if (type === 'co64') {
          const entryCount = view.getUint32(i + 12, false);
          let entryOffset = i + 16;
          for (let j = 0; j < entryCount; j++) {
            if (entryOffset + 8 > len) break;
            const high = view.getUint32(entryOffset, false);
            const low = view.getUint32(entryOffset + 4, false);
            let val = high * 4294967296 + low + moovShift;
            view.setUint32(entryOffset, Math.floor(val / 4294967296), false);
            view.setUint32(entryOffset + 4, val >>> 0, false);
            entryOffset += 8;
          }
        }
      }
    };

    updateChunkOffsets(moovView);

    // Monta o novo binário MP4 na ordem: [ftyp] + [moov atualizado] + [mdat e outros]
    const beforeMoov = buffer.slice(ftypBox.start + ftypBox.length, moovBox.start);
    const afterMoov = buffer.slice(moovBox.start + moovBox.length);

    const reorderedBlob = new Blob(
      [
        buffer.slice(0, ftypBox.start + ftypBox.length),
        moovBuffer,
        beforeMoov,
        afterMoov,
      ],
      { type: file.type || 'video/mp4' }
    );

    return { blob: reorderedBlob, wasRelocated: true };
  } catch (err) {
    console.warn('[MP4 FastStart] Falha segura, mantendo arquivo original:', err);
    return { blob: file, wasRelocated: false };
  }
}
