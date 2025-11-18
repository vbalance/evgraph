import matplotlib.pyplot as plt
import pandas as pd
import matplotlib.dates as mdates
from io import StringIO
import numpy as np

# ============================================================================
# 1. ПОДГОТОВКА ДАННЫХ
# ============================================================================

data = """Time,Soft_Odds_Green,Fair_Odds_Red
21:59:55,1.90,1.70
22:01:53,2.00,1.72
22:03:51,2.00,1.85
22:05:49,2.15,2.10
22:07:47,2.20,2.28
22:09:45,2.40,2.45
22:11:43,2.50,2.58
22:13:41,2.60,2.70
22:14:37,2.75,2.78
22:15:30,2.75,2.80
22:15:36,3.00,2.82
22:15:57,3.00,2.85
22:16:01,2.75,2.86
22:16:18,2.75,2.88
22:16:23,3.00,2.90
22:17:30,3.00,3.00
22:17:35,3.25,3.05
22:18:21,3.25,3.20
22:18:25,3.40,3.30
22:19:31,3.40,3.50"""

# Парсинг данных
df = pd.read_csv(StringIO(data))
df['Time'] = pd.to_datetime(df['Time'], format='%H:%M:%S')

# Расчет Lifetime (время до следующего изменения любого из коэффициентов)
df['Lifetime'] = (df['Time'].shift(-1) - df['Time']).dt.total_seconds()

# Создаем копии для построения графиков
df['Soft_Odds_Plot'] = df['Soft_Odds_Green'].copy()
df['Fair_Odds_Plot'] = df['Fair_Odds_Red'].copy()

# Симуляция разрывов данных (опционально)
df.loc[4:5, 'Soft_Odds_Plot'] = np.nan
df.loc[12:13, 'Fair_Odds_Plot'] = np.nan

# Расчет EV (Expected Value)
df['EV_Value'] = (1 / df['Fair_Odds_Red']) * df['Soft_Odds_Green'] - 1

# ============================================================================
# 1.1. ДАННЫЕ О СТАВКАХ
# ============================================================================

# Данные о попытках ставок
# Отрезок №2 = индекс 1 (22:01:53)
# Отрезок №5 = индекс 4 (22:07:47)
# Отрезок №7 = индекс 6 (22:11:43)

# Используем отрезки с положительным EV:
# Отрезок 2 (индекс 1): 22:01:53, Soft=2.00, Fair=1.72, EV=16.3%
# Отрезок 10 (индекс 9): 22:15:30, Soft=2.75, Fair=2.80, EV=-1.8% -> берем отрезок 11
# Отрезок 11 (индекс 10): 22:15:36, Soft=3.00, Fair=2.82, EV=6.4%
# Отрезок 15 (индекс 14): 22:16:23, Soft=3.00, Fair=2.90, EV=3.4%

bets_data = """Timestamp,Soft_Odds,Fair_Odds,EV,Acceptance_Time,Status
22:01:55,2.00,1.72,16.3,20.0,Accepted
22:15:38,3.00,2.82,6.4,25.0,Rejected
22:16:25,3.00,2.90,3.4,5.0,Rejected"""

# Парсинг данных о ставках
df_bets = pd.read_csv(StringIO(bets_data))
df_bets['Timestamp'] = pd.to_datetime(df_bets['Timestamp'], format='%H:%M:%S')

# ============================================================================
# 2. ПОСТРОЕНИЕ ГРАФИКА
# ============================================================================

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(14, 8))

# ============================================================================
# 3. ГРАДИЕНТНАЯ ЗАЛИВКА EV+ (КРИТИЧЕСКИЙ КОМПОНЕНТ)
# ============================================================================

# Заливаем каждый временной интервал отдельно
# Это гарантирует, что градиент строится индивидуально для каждого отрезка
for idx, row in df.iterrows():
    # Проверяем, что у нас есть валидные данные и положительный EV
    if pd.notna(row['Soft_Odds_Plot']) and pd.notna(row['Fair_Odds_Plot']) and row['EV_Value'] > 0:

        # EV текущего интервала
        ev_value = row['EV_Value']
        ev_percent_max = int(np.ceil(ev_value * 100))

        # Временные границы интервала
        time_start = row['Time']
        # Для step='post' интервал идет до следующей точки
        if idx < len(df) - 1:
            time_end = df.iloc[idx + 1]['Time']
        else:
            # Для последней точки создаем небольшой интервал
            time_end = time_start + pd.Timedelta(seconds=1)

        # Строим градиент для этого интервала по слоям 1% EV
        for ev_percent in range(1, ev_percent_max + 1):
            ev_threshold = ev_percent / 100.0

            # Границы слоя для этого интервала
            layer_bottom = row['Fair_Odds_Plot'] * (1 + ev_threshold - 0.01)
            layer_top = row['Fair_Odds_Plot'] * (1 + ev_threshold)

            # КРИТИЧЕСКИ ВАЖНО: обрезаем верхнюю границу по Soft Odds
            layer_top = min(layer_top, row['Soft_Odds_Plot'])

            # Расчет прозрачности (alpha)
            if ev_threshold <= 0.10:
                alpha = 0.1 + (ev_threshold * 7)
            else:
                alpha = 0.80

            # Рисуем слой для этого интервала
            ax.fill_between([time_start, time_end],
                          [layer_bottom, layer_bottom],
                          [layer_top, layer_top],
                          color='#00ff00', alpha=alpha,
                          step='post', zorder=2)

# ============================================================================
# 4. СЕТКА УРОВНЕЙ EV
# ============================================================================

# Рисуем сетку уровней для каждого интервала индивидуально
for idx, row in df.iterrows():
    if pd.notna(row['Soft_Odds_Plot']) and pd.notna(row['Fair_Odds_Plot']) and row['EV_Value'] > 0:

        # Временные границы интервала
        time_start = row['Time']
        if idx < len(df) - 1:
            time_end = df.iloc[idx + 1]['Time']
        else:
            time_end = time_start + pd.Timedelta(seconds=1)

        # Рисуем линии уровней до максимума EV для этого интервала
        ev_value = row['EV_Value']
        max_grid_ev = min(ev_value, 0.25)  # До 25% максимум

        for ev_threshold in np.arange(0.01, max_grid_ev + 0.01, 0.01):
            grid_y = row['Fair_Odds_Plot'] * (1 + ev_threshold)

            # Рисуем только если линия ниже Soft Odds
            if grid_y <= row['Soft_Odds_Plot']:
                ax.plot([time_start, time_end],
                       [grid_y, grid_y],
                       color='#00ff00', linewidth=0.3, alpha=0.3,
                       zorder=1)

# ============================================================================
# 5. ОСНОВНЫЕ ЛИНИИ И ТОЧКИ
# ============================================================================

# Fair Odds (красная линия)
ax.plot(df['Time'], df['Fair_Odds_Plot'],
        color='#ff3333', linewidth=2.5,
        drawstyle='steps-post', label='Fair Odds', zorder=3)

# Soft Odds (зеленая линия)
ax.plot(df['Time'], df['Soft_Odds_Plot'],
        color='#00ff00', linewidth=2,
        drawstyle='steps-post', label='Soft Odds', zorder=4)

# Точки на Fair Odds (красные)
ax.scatter(df['Time'], df['Fair_Odds_Plot'],
          color='#ff3333', s=25, zorder=5)

# Точки на Soft Odds (зеленые)
ax.scatter(df['Time'], df['Soft_Odds_Plot'],
          color='#00ff00', s=25, zorder=5)

# ============================================================================
# 5.1. ВИЗУАЛИЗАЦИЯ СТАВОК
# ============================================================================

for idx, bet in df_bets.iterrows():
    bet_start = bet['Timestamp']
    bet_end = bet_start + pd.Timedelta(seconds=bet['Acceptance_Time'])

    # Цвет бочки в зависимости от статуса
    if bet['Status'] == 'Accepted':
        barrel_color = '#00BFFF'  # Голубой (Deep Sky Blue)
        status_text = 'ACCEPTED'
    else:
        barrel_color = '#FFD700'  # Желтый (Gold)
        status_text = 'REJECTED'

    # Используем Soft Odds из данных ставки (уровень в момент попытки)
    barrel_y = bet['Soft_Odds']

    # Рисуем "бочку" (толстая горизонтальная линия на уровне Soft Odds)
    ax.plot([bet_start, bet_end], [barrel_y, barrel_y],
            color=barrel_color, linewidth=15, solid_capstyle='round',
            alpha=0.8, zorder=6)

    # Добавляем вертикальные маркеры начала и конца
    ax.axvline(x=bet_start, color=barrel_color, linewidth=1.5,
               linestyle='--', alpha=0.5, zorder=5)
    ax.axvline(x=bet_end, color=barrel_color, linewidth=1.5,
               linestyle='--', alpha=0.5, zorder=5)

# ============================================================================
# 6. АННОТАЦИИ (информационные метки)
# ============================================================================

# Отображаем метки только для позиций с EV > 0
# Разносим их по разным уровням, чтобы избежать наложения
annotation_counter = 0
for idx, row in df.iterrows():
    if pd.notna(row['Soft_Odds_Plot']) and pd.notna(row['Fair_Odds_Plot']) and row['EV_Value'] > 0:
        ev_percent = row['EV_Value'] * 100
        lifetime_str = f"{int(row['Lifetime'])}s" if pd.notna(row['Lifetime']) else "Last"

        # Формируем текст метки
        label_text = (f"S:{row['Soft_Odds_Plot']:.2f}\n"
                      f"F:{row['Fair_Odds_Plot']:.2f}\n"
                      f"EV:+{ev_percent:.1f}%\n"
                      f"Life:{lifetime_str}")

        # Позиционирование
        x_pos = row['Time']
        y_pos = row['Soft_Odds_Plot']

        # Чередуем вертикальное смещение для разных уровней
        # Создаем 3 уровня: 35, 80, 125 пикселей
        vertical_offsets = [35, 80, 125]
        y_offset = vertical_offsets[annotation_counter % 3]
        annotation_counter += 1

        # Рисуем аннотацию
        ax.annotate(label_text,
                    xy=(x_pos, y_pos),
                    xytext=(0, y_offset),
                    textcoords='offset points',
                    ha='center', va='bottom',
                    fontsize=7,
                    fontweight='bold',
                    color='#00ff00',
                    bbox=dict(boxstyle="round,pad=0.3",
                             fc="#1a1a1a",
                             ec="#00ff00",
                             lw=0.5,
                             alpha=0.9),
                    arrowprops=dict(arrowstyle='-',
                                   color='gray',
                                   lw=0.5),
                    zorder=10)

# ============================================================================
# 6.1. АННОТАЦИИ ДЛЯ СТАВОК
# ============================================================================

for idx, bet in df_bets.iterrows():
    bet_start = bet['Timestamp']
    bet_end = bet_start + pd.Timedelta(seconds=bet['Acceptance_Time'])

    # Цвет и статус
    if bet['Status'] == 'Accepted':
        barrel_color = '#00BFFF'
        status_text = 'ACCEPTED'
    else:
        barrel_color = '#FFD700'
        status_text = 'REJECTED'

    # Центр бочки для позиционирования аннотации
    bet_center = bet_start + pd.Timedelta(seconds=bet['Acceptance_Time'] / 2)

    # Текст аннотации
    bet_label = (f"{status_text}\n"
                 f"S:{bet['Soft_Odds']:.2f} F:{bet['Fair_Odds']:.2f}\n"
                 f"EV:{bet['EV']:+.1f}%\n"
                 f"Accept:{bet['Acceptance_Time']:.1f}s")

    # Позиция Y для аннотации (над бочкой) - используем Soft Odds
    barrel_y = bet['Soft_Odds']

    # Рисуем аннотацию над бочкой
    ax.annotate(bet_label,
                xy=(bet_center, barrel_y),
                xytext=(0, 20),
                textcoords='offset points',
                ha='center', va='bottom',
                fontsize=7,
                fontweight='bold',
                color=barrel_color,
                bbox=dict(boxstyle="round,pad=0.3",
                         fc="#1a1a1a",
                         ec=barrel_color,
                         lw=1.5,
                         alpha=0.95),
                arrowprops=dict(arrowstyle='-',
                               color=barrel_color,
                               lw=1),
                zorder=11)

# ============================================================================
# 7. ОФОРМЛЕНИЕ ГРАФИКА
# ============================================================================

ax.set_title('Odds History Analysis: Profit Gradient & Lifetime',
             color='white', fontsize=14, fontweight='bold', pad=15)
ax.set_ylabel('Odds', color='white')
ax.grid(True, color='gray', linestyle='--', linewidth=0.5, alpha=0.2)

# Настройка оси X с метками времени для всех точек
ax.set_xticks(df['Time'])
ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
plt.xticks(rotation=45, ha='right')

ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.legend(loc='upper left', frameon=False)

plt.tight_layout()
plt.show()
