import subprocess
import sys

try:
    import paramiko
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "paramiko"], check=True)
    import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Conectando à VPS 37.148.134.48...")
client.connect('37.148.134.48', username='root', password='tZrBfmhsvr', timeout=15)
print("Conectado!")

# Puxa o código novo
print("\n--- git pull ---")
stdin, stdout, stderr = client.exec_command('cd /root/chatboot && git pull 2>&1')
print(stdout.read().decode())

# Reinicia o container
print("\n--- docker restart chatboot-api ---")
stdin, stdout, stderr = client.exec_command('docker restart chatboot-api 2>&1')
out = stdout.read().decode()
err = stderr.read().decode()
print("OUT:", out)
print("ERR:", err)

# Verifica se está rodando
print("\n--- docker ps ---")
stdin, stdout, stderr = client.exec_command('docker ps --filter name=chatboot-api --format "{{.Names}} | {{.Status}}"')
print(stdout.read().decode())

client.close()
print("\nFinalizado!")
