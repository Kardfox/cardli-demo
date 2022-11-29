import logging


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

handler = logging.FileHandler("log.log", mode='w')
handler.setFormatter(
    logging.Formatter("%(asctime)s - %(levelname)s - %(filename)s/%(funcName)s:\n%(message)s\n",)
)

logger.addHandler(handler)