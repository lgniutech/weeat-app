/**
 * Converte um arquivo de imagem para WebP e redimensiona no cliente (navegador).
 * Não requer bibliotecas externas.
 */
export async function compressImage(file: File, quality = 0.8, maxWidth = 1200): Promise<File> {
    return new Promise((resolve, reject) => {
        // Se não for imagem, retorna o arquivo original
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar mantendo proporção
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Erro ao criar contexto do canvas'));
                    return;
                }

                // Fundo branco para caso de conversão de PNG transparente para JPG (opcional, mas WebP suporta transparência)
                // ctx.fillStyle = '#FFFFFF';
                // ctx.fillRect(0, 0, width, height);
                
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Erro na compressão da imagem'));
                        return;
                    }
                    
                    // Criar novo arquivo WebP com o mesmo nome base
                    const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                    const newFile = new File([blob], newName, {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    
                    resolve(newFile);
                }, 'image/webp', quality);
            };
            
            img.onerror = (error) => reject(error);
        };
        
        reader.onerror = (error) => reject(error);
    });
}
