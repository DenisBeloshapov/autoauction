-- AddColumn: bodyNumber на WonLot
-- Хранит номер кузова / описание из текста между lotNumber и price
-- при принятии ставок (админ вставляет строку вида "12345 HONDA PRELUDE white 500000"
-- → lotNumber=12345, price=500000, bodyNumber="HONDA PRELUDE white")

ALTER TABLE "WonLot" ADD COLUMN "bodyNumber" TEXT;
