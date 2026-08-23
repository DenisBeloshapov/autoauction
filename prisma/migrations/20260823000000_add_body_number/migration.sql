-- AddColumn: bodyNumber на WonLot
-- Хранит номер кузова / описание из текста между lotNumber и price

ALTER TABLE "WonLot" ADD COLUMN "bodyNumber" TEXT;
